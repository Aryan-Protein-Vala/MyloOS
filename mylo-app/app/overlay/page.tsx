'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MousePointer2, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import { RoughCircle } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { askAi, analyzeForDoMode, type DoAction } from '@/lib/ai-client'
import { startRecording, stopRecordingAndTranscribe, playTTS } from '@/lib/audioStream'

type OverlayMode = 'hidden' | 'coach' | 'do' | 'ask'

interface Selection {
  x: number
  y: number
  w: number
  h: number
}

export default function OverlayPage() {
  const [mode, setMode] = useState<OverlayMode>('hidden')
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 })

  // ── Ask Mode ───────────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [askSelection, setAskSelection] = useState<Selection | null>(null)
  const [askProcessing, setAskProcessing] = useState(false)
  const [askResponse, setAskResponse] = useState<string | null>(null)

  // ── Do Mode ────────────────────────────────────────────────────────────────
  // Do Mode has its own independent draw phase before sending to AI
  const [doPhase, setDoPhase] = useState<'idle' | 'drawing' | 'intent' | 'analyzing' | 'approve' | 'executing'>('idle')
  const [doStartPos, setDoStartPos] = useState({ x: 0, y: 0 })
  const [doCurrentPos, setDoCurrentPos] = useState({ x: 0, y: 0 })
  const [doSelection, setDoSelection] = useState<Selection | null>(null)
  const [userIntent, setUserIntent] = useState('')
  const [pendingAction, setPendingAction] = useState<DoAction | null>(null)
  const [doError, setDoError] = useState<string | null>(null)
  const intentInputRef = useRef<HTMLInputElement>(null)

  // ── Agentic State Machine ──────────────────────────────────────────────────
  const [isPttPressed, setIsPttPressed] = useState(false)
  const [agentPhase, setAgentPhase] = useState<'idle' | 'listening' | 'thinking' | 'acting'>('idle')
  const [agentCursor, setAgentCursor] = useState<{x: number | number[], y: number | number[]} | null>(null)
  const lastCursorPos = useRef<{x: number, y: number} | null>(null)
  const [agentMessage, setAgentMessage] = useState<string | null>(null)

  // ── Stream safety ──────────────────────────────────────────────────────────
  const [isStreamSafe, setIsStreamSafe] = useState(false)

  // ── Double-Esc dismiss & Cancellation ──────────────────────────────────────
  const lastEscTime = useRef(0)
  const isAgentCancelledRef = useRef(false)
  const micFailedRef = useRef(false)
  const agentTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const dismissOverlay = useCallback(async () => {
    isAgentCancelledRef.current = true
    if (agentTimeoutRef.current) {
      clearTimeout(agentTimeoutRef.current)
      agentTimeoutRef.current = null
    }
    setAgentPhase('idle')
    setAgentMessage(null)
    setAgentCursor(null)

    setMode('hidden')
    setAskSelection(null)
    setAskResponse(null)
    setAskProcessing(false)
    setDoPhase('idle')
    setDoSelection(null)
    setPendingAction(null)
    setDoError(null)
    setUserIntent('')
    try {
      await invoke('cancel_do_action')
    } catch {}
    await invoke('toggle_overlay', { visible: false, clickThrough: true })
  }, [])

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      invoke<boolean>('verify_stream_safety').then((val) => {
        if (mounted) setIsStreamSafe(val)
      }).catch(console.error)
    }

    let unlistenState: (() => void) | null = null
    let unlistenTarget: (() => void) | null = null
    let unlistenPtt: (() => void) | null = null

    const setup = async () => {
      if (typeof window === 'undefined' || !(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) return

      // Overlay state from hotkeys
      const cleanState = await listen<OverlayMode>('overlay-state-changed', (event) => {
        if (!mounted) return
        const newMode = event.payload
        setMode(newMode)

        if (newMode === 'ask') {
          setAskSelection(null)
          setAskResponse(null)
          setAskProcessing(false)
          invoke('set_overlay_interactive', { interactive: true })
        } else if (newMode === 'do') {
          setDoPhase('idle')
          setDoSelection(null)
          setPendingAction(null)
          setDoError(null)
          setUserIntent('')
          invoke('set_overlay_interactive', { interactive: true }) // do mode needs drawing too
        } else if (newMode === 'hidden') {
          isAgentCancelledRef.current = true
          if (agentTimeoutRef.current) {
            clearTimeout(agentTimeoutRef.current)
            agentTimeoutRef.current = null
          }
          setAgentPhase('idle')
          setAgentMessage(null)
          setAgentCursor(null)
          setDoPhase('idle')
          setPendingAction(null)
          invoke('set_overlay_interactive', { interactive: false })
        } else {
          invoke('set_overlay_interactive', { interactive: false })
        }

        setTimeout(() => {
          if (mounted) {
            invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(console.error)
          }
        }, 100)
      })

      if (!mounted) {
        cleanState()
      } else {
        unlistenState = cleanState
      }

      // Coach mode target position updates
      const cleanTarget = await listen<{ x: number; y: number }>('target-pos-changed', (event) => {
        if (!mounted) return
        setTargetPos(event.payload)
      })

      if (!mounted) {
        cleanTarget()
      } else {
        unlistenTarget = cleanTarget
      }

      // PTT listener
      const cleanPtt = await listen<string>('ptt-state-changed', async (event) => {
        if (!mounted) return
        const state = event.payload
        if (state === 'pressed') {
          if (agentTimeoutRef.current) {
            clearTimeout(agentTimeoutRef.current)
            agentTimeoutRef.current = null
          }
          micFailedRef.current = false
          isAgentCancelledRef.current = false
          setIsPttPressed(true)
          setAgentPhase('listening')
          setAgentMessage('Listening to you...')
          const started = await startRecording()
          if (!started) {
            micFailedRef.current = true
            setAgentMessage('Microphone access failed. Check permissions.')
            agentTimeoutRef.current = setTimeout(async () => {
              setAgentPhase('idle')
              setAgentMessage(null)
              try {
                await invoke('toggle_overlay', { visible: false, clickThrough: true })
              } catch {}
            }, 3000)
          }
        } else if (state === 'released') {
          setIsPttPressed(false)
          if (micFailedRef.current || isAgentCancelledRef.current) return

          setAgentPhase('thinking')
          setAgentMessage('Transcribing...')
          const groqKey = await invoke<string | null>('get_api_key', { provider: 'groq' })
          const res = await stopRecordingAndTranscribe(groqKey || '')
          
          if (isAgentCancelledRef.current) {
            setAgentPhase('idle')
            setAgentMessage(null)
            return
          }

          if (res.text && res.text.trim()) {
            setAgentMessage(`Thinking about: "${res.text.trim()}"`)
            await runAgenticLoop(res.text.trim())
          } else {
            setAgentMessage(res.error || (groqKey ? 'No speech detected.' : 'Groq API Key required for voice.'))
            agentTimeoutRef.current = setTimeout(async () => {
              setAgentPhase('idle')
              setAgentMessage(null)
              try {
                await invoke('toggle_overlay', { visible: false, clickThrough: true })
              } catch {}
            }, 2500)
          }
        }
      })

      if (!mounted) {
        cleanPtt()
      } else {
        unlistenPtt = cleanPtt
      }
    }

    setup().catch(console.error)

    // Double-Esc to dismiss
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now()
        if (now - lastEscTime.current < 400) {
          dismissOverlay()
        }
        lastEscTime.current = now
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      mounted = false
      if (unlistenState) unlistenState()
      if (unlistenTarget) unlistenTarget()
      if (unlistenPtt) unlistenPtt()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dismissOverlay])

  const runAgenticLoop = async (intent: string) => {
    isAgentCancelledRef.current = false
    setAgentPhase('thinking')

    const MAX_STEPS = 5
    let currentStep = 0
    let isComplete = false

    try {
      const sarvamKey = await invoke<string | null>('get_api_key', { provider: 'sarvam' })

      while (currentStep < MAX_STEPS && !isComplete && !isAgentCancelledRef.current) {
        currentStep++
        setAgentMessage(currentStep === 1 ? 'Analyzing screen...' : `Step ${currentStep}: Analyzing screen...`)

        const width = typeof window !== 'undefined' ? window.innerWidth : 1920
        const height = typeof window !== 'undefined' ? window.innerHeight : 1080

        const { image: base64Img, rect } = await invoke<{
          image: string | null
          rect: { x: number; y: number; width: number; height: number }
        }>('capture_screen_crop', {
          x: 0,
          y: 0,
          width,
          height,
        })

        if (!base64Img || isAgentCancelledRef.current) break

        const action = await analyzeForDoMode(base64Img, intent, rect)
        if (isAgentCancelledRef.current) break

        if (!action || action.actionType === 'none') {
          if (sarvamKey && currentStep === 1) {
            playTTS("I'm not sure how to complete that action.", sarvamKey).catch(console.error)
          }
          setAgentMessage("Could not determine safe action.")
          break
        }

        setAgentPhase('acting')
        setAgentMessage(`Step ${currentStep}: ${action.description}`)

        if (sarvamKey) {
          playTTS(`I will ${action.description}`, sarvamKey).catch(console.error)
        }

        // Animate Bezier cursor to target coordinate (scale physical pixels to CSS pixels)
        if (action.x != null && action.y != null) {
          const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
          const targetX = (action.x - rect.x) / dpr
          const targetY = (action.y - rect.y) / dpr
          
          let startX = width / 2
          let startY = height - 100
          if (lastCursorPos.current) {
            startX = lastCursorPos.current.x
            startY = lastCursorPos.current.y
          }

          // Generate quadratic Bezier path
          const midX = (startX + targetX) / 2
          const midY = (startY + targetY) / 2
          const dx = targetX - startX
          const dy = targetY - startY
          const dist = Math.hypot(dx, dy)

          // Clamp curvature so cursor doesn't fly off screen on large displays
          const curvature = Math.min(100, Math.max(15, dist * 0.2))
          const nx = dist > 0 ? -dy / dist : 0
          const ny = dist > 0 ? dx / dist : 0

          // Control point offset perpendicular to the line
          const cpX = midX + nx * curvature
          const cpY = midY + ny * curvature

          const pathX = []
          const pathY = []
          for (let i = 0; i <= 20; i++) {
            const t = i / 20
            const x = (1-t)*(1-t)*startX + 2*(1-t)*t*cpX + t*t*targetX
            const y = (1-t)*(1-t)*startY + 2*(1-t)*t*cpY + t*t*targetY
            pathX.push(x)
            pathY.push(y)
          }

          setAgentCursor({ x: pathX, y: pathY })
          lastCursorPos.current = { x: targetX, y: targetY }

          // Allow flight animation to guide user eye before executing
          await new Promise((r) => setTimeout(r, 750))
        }

        if (isAgentCancelledRef.current) break

        // Execute action in Rust
        await invoke('execute_agentic_action', { action })

        // Check if task is finished
        if (action.status === 'complete') {
          isComplete = true
          setAgentMessage(`Complete: ${action.description}`)
          break
        }

        // Delay between loop iterations for UI to settle
        await new Promise((r) => setTimeout(r, 600))
      }
    } catch (e) {
      console.error("Agentic loop error:", e)
      setAgentMessage('Action failed or cancelled.')
    } finally {
      agentTimeoutRef.current = setTimeout(async () => {
        setAgentPhase('idle')
        setAgentMessage(null)
        setAgentCursor(null)
        if (mode === 'hidden') {
          try {
            await invoke('toggle_overlay', { visible: false, clickThrough: true })
          } catch {}
        }
      }, 2500)
    }
  }

  // ── Ask Mode pointer handlers ──────────────────────────────────────────────

  const isAskDrawable = mode === 'ask' && !askSelection && !askProcessing

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (mode === 'ask' && isAskDrawable) {
      setIsDragging(true)
      setStartPos({ x: e.clientX, y: e.clientY })
      setCurrentPos({ x: e.clientX, y: e.clientY })
    } else if (mode === 'do' && doPhase === 'idle') {
      setDoPhase('drawing')
      setDoStartPos({ x: e.clientX, y: e.clientY })
      setDoCurrentPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) setCurrentPos({ x: e.clientX, y: e.clientY })
    if (doPhase === 'drawing') setDoCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    // ── Ask Mode finish draw ──
    if (isDragging) {
      setIsDragging(false)
      const x = Math.min(startPos.x, currentPos.x)
      const y = Math.min(startPos.y, currentPos.y)
      const w = Math.abs(currentPos.x - startPos.x)
      const h = Math.abs(currentPos.y - startPos.y)
      if (w < 10 || h < 10) return

      const sel = { x, y, w, h }
      setAskSelection(sel)
      // Keep interactive so the user can interact with the Clear selection button
      await runAskCapture(sel)
    }

    // ── Do Mode finish draw ──
    if (doPhase === 'drawing') {
      const x = Math.min(doStartPos.x, doCurrentPos.x)
      const y = Math.min(doStartPos.y, doCurrentPos.y)
      const w = Math.abs(doCurrentPos.x - doStartPos.x)
      const h = Math.abs(doCurrentPos.y - doStartPos.y)

      if (w < 10 || h < 10) {
        setDoPhase('idle')
        return
      }

      const sel = { x, y, w, h }
      setDoSelection(sel)
      setDoPhase('intent')
      // Maintain interactivity so the user can type in the intent card
      setTimeout(() => intentInputRef.current?.focus(), 100)
    }
  }

  // ── Ask Mode: capture + AI ─────────────────────────────────────────────────

  const runAskCapture = async (sel: Selection) => {
    setAskProcessing(true)
    try {
      const { image: base64Img, rect } = await invoke<{ image: string | null; rect: { x: number; y: number; width: number; height: number } }>('capture_screen_crop', {
        x: sel.x,
        y: sel.y,
        width: sel.w,
        height: sel.h,
      })

      if (base64Img) {
        const response = await askAi('What is happening in this circled area? Be brief and direct.', base64Img)
        setAskResponse(response)
      } else {
        setAskResponse('Failed to capture screen region.')
      }
    } catch (err) {
      console.error(err)
      setAskResponse('Error during capture or AI call.')
    } finally {
      setAskProcessing(false)
    }
  }

  // ── Do Mode: capture + AI + execution ─────────────────────────────────────

  const runDoAnalyze = async () => {
    if (!doSelection || !userIntent.trim()) return
    setDoPhase('analyzing')

    try {
      const { image: base64Img, rect } = await invoke<{ image: string | null; rect: { x: number; y: number; width: number; height: number } }>('capture_screen_crop', {
        x: doSelection.x,
        y: doSelection.y,
        width: doSelection.w,
        height: doSelection.h,
      })

      if (!base64Img) {
        setDoError('Failed to capture screen region.')
        setDoPhase('idle')
        return
      }

      const action = await analyzeForDoMode(base64Img, userIntent, rect)

      if (!action) {
        setDoError("MYLO couldn't determine a safe action. Try again with a more specific intent.")
        setDoPhase('idle')
        return
      }

      // The backend compute physical pixels using ratioX/ratioY based on rect.
      // No frontend dpr arithmetic needed!

      setPendingAction(action)
      setDoPhase('approve')
    } catch (err) {
      console.error(err)
      setDoError('Error analyzing intent or approving action.')
      setDoPhase('idle')
    }
  }

  const handleApproveAction = async () => {
    if (!pendingAction) return
    const actionToRun = pendingAction
    setDoPhase('executing')
    setDoError(null)
    try {
      // 1. Hide overlay first without disarming the action guard
      setMode('hidden')
      setDoPhase('idle')
      setDoSelection(null)
      setPendingAction(null)
      await invoke('toggle_overlay', { visible: false, clickThrough: true })

      // Give window manager 150ms to hide overlay and restore focus to target app
      await new Promise((r) => setTimeout(r, 150))

      // 2. Arm the action guard now that overlay is hidden
      await invoke('approve_do_action', { action: actionToRun })

      // 3. Execute synthetic input
      await invoke('execute_do_action', { action: actionToRun })
    } catch (e) {
      setDoError(`Action failed: ${e instanceof Error ? e.message : String(e)}`)
      setPendingAction(actionToRun)
      setDoPhase('approve')
      setMode('do')
      await invoke('toggle_overlay', { visible: true, clickThrough: false })
    }
  }

  const handleRejectAction = async () => {
    await invoke('cancel_do_action')
    setPendingAction(null)
    setDoError(null)
    setDoSelection(null)
    setDoPhase('idle')
    invoke('set_overlay_interactive', { interactive: true })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (mode === 'hidden' && agentPhase === 'idle') return null

  const isDoDrawing = mode === 'do' && (doPhase === 'idle' || doPhase === 'drawing')
  const needsPointerEvents =
    (mode === 'ask' && isAskDrawable) ||
    (mode === 'ask' && !!askSelection) ||
    isDoDrawing ||
    (mode === 'do' && doPhase !== 'idle') // Keep pointer events for cards in do mode

  return (
    <div
      id="mylo-overlay-root"
      className={`fixed inset-0 w-screen h-screen z-[9999] overflow-hidden bg-transparent ${
        needsPointerEvents ? 'pointer-events-auto' : 'pointer-events-none'
      } ${isAskDrawable || isDoDrawing ? 'cursor-crosshair' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── Stream Shield HUD ─────────────────────────────────────────── */}
      {isStreamSafe && (
        <div className="fixed top-4 right-4 bg-[var(--ink)] text-[var(--green)] px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 z-[10000] shadow-[2px_2px_0_var(--green)] border border-[var(--green)] pointer-events-none">
          🔒 Stream Shield Active
        </div>
      )}

      {/* ── Mode hint (top-left) ───────────────────────────────────────── */}
      {mode !== 'hidden' && (
        <div className="fixed top-4 left-4 pointer-events-none z-[10000]">
          <div className="bg-[var(--ink)] text-[var(--paper)] px-3 py-1 text-xs font-mono opacity-70 border border-[var(--ink)]">
            {mode === 'ask' && '● ASK MODE — draw to circle'}
            {mode === 'do' && doPhase === 'idle' && '● DO MODE — draw around target'}
            {mode === 'do' && doPhase === 'drawing' && '● DO MODE — drawing...'}
            {mode === 'do' && doPhase === 'intent' && '● DO MODE — describe your intent'}
            {mode === 'do' && doPhase === 'analyzing' && '● DO MODE — analyzing...'}
            {mode === 'do' && doPhase === 'approve' && '● DO MODE — approve action?'}
            {mode === 'do' && doPhase === 'executing' && '● DO MODE — executing...'}
            {mode === 'coach' && '● COACH MODE'}
          </div>
          <div className="text-[8px] font-mono text-[var(--ink)] mt-1 opacity-50">
            double-Esc to dismiss
          </div>
        </div>
      )}

      {/* ── Coach Mode ────────────────────────────────────────────────── */}
      {mode === 'coach' && (
        <>
          <div className="absolute" style={{ left: targetPos.x - 100, top: targetPos.y - 100, width: 200, height: 200 }}>
            <div className="absolute inset-0 border-4 border-dashed border-[var(--blue)] rounded-full opacity-50" />
            <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          </div>
          <div className="absolute" style={{ left: targetPos.x + 80, top: targetPos.y - 80 }}>
            <div className="speech pointer-events-auto">
              <b>MYLO says:</b>
              <br />
              Click here to proceed.
            </div>
          </div>
        </>
      )}

      {/* ── Ask Mode: live selection box ─────────────────────────────── */}
      {isDragging && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y),
          }}
        >
          <div className="absolute inset-0 bg-[var(--blue)] opacity-10 rounded-full" />
          <RoughCircle className="text-[var(--blue)] drop-shadow-md" />
        </div>
      )}

      {/* ── Ask Mode: frozen selection + sticky note ──────────────────── */}
      {askSelection && (
        <div
          className="absolute pointer-events-none"
          style={{ left: askSelection.x, top: askSelection.y, width: askSelection.w, height: askSelection.h }}
        >
          <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          <div
            className={`absolute top-0 w-72 pointer-events-auto ${
              typeof window !== 'undefined' && askSelection.x + askSelection.w + 320 > window.innerWidth
                ? 'right-full mr-4'
                : 'left-full ml-4'
            }`}
          >
            <div className="speech">
              <b>MYLO says:</b>
              <br />
              {askProcessing ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-75" />
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-150" />
                </div>
              ) : (
                <p className="mt-2 text-sm whitespace-pre-wrap">{askResponse}</p>
              )}
              {!askProcessing && (
                <button
                  className="mt-3 text-xs underline text-gray-500 hover:text-black"
                  onClick={() => {
                    setAskSelection(null)
                    setAskResponse(null)
                    invoke('set_overlay_interactive', { interactive: true })
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ask Mode: hint card (shown when idle) ────────────────────── */}
      {mode === 'ask' && !askSelection && !isDragging && (
        <div className="absolute bottom-12 right-12 pointer-events-none">
          <div className="p-5 bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--green)] max-w-xs rounded-lg">
            <b className="text-[var(--ink)] font-sans text-base block mb-1">Draw to Ask</b>
            <p className="font-mono text-xs opacity-70">
              Click and drag to circle anything on your screen.
            </p>
          </div>
        </div>
      )}

      {/* ── Do Mode: live selection box ──────────────────────────────── */}
      {doPhase === 'drawing' && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: Math.min(doStartPos.x, doCurrentPos.x),
            top: Math.min(doStartPos.y, doCurrentPos.y),
            width: Math.abs(doCurrentPos.x - doStartPos.x),
            height: Math.abs(doCurrentPos.y - doStartPos.y),
          }}
        >
          <div className="absolute inset-0 bg-[var(--yellow)] opacity-20 rounded-full" />
          <RoughCircle className="text-[var(--blue)] drop-shadow-md" />
        </div>
      )}

      {/* ── Do Mode: frozen selection outline ──────────────────────────── */}
      {doSelection && doPhase !== 'idle' && doPhase !== 'drawing' && (
        <div
          className="absolute pointer-events-none"
          style={{ left: doSelection.x, top: doSelection.y, width: doSelection.w, height: doSelection.h }}
        >
          <RoughCircle className="text-[var(--blue)] drop-shadow-md" />
        </div>
      )}

      {/* ── Do Mode: intent input card ──────────────────────────────────── */}
      {doPhase === 'intent' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto z-[10001]">
          <div className="task-card w-[380px]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-[var(--blue)]" />
              <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">What should MYLO do?</span>
            </div>
            <input
              ref={intentInputRef}
              type="text"
              value={userIntent}
              onChange={(e) => setUserIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runDoAnalyze()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  handleRejectAction()
                }
              }}
              placeholder="e.g. Click the Export button"
              className="w-full p-3 border-2 border-[var(--ink)] bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--blue)] text-white border-2 border-[var(--ink)] px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--green)] hover:text-[var(--ink)] transition-colors"
                onClick={runDoAnalyze}
                disabled={!userIntent.trim()}
              >
                <CheckCircle2 size={12} /> Analyze
              </button>
              <button
                className="flex items-center gap-2 bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-red-100 transition-colors"
                onClick={handleRejectAction}
              >
                <XCircle size={12} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Do Mode: analyzing spinner ──────────────────────────────────── */}
      {doPhase === 'analyzing' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto z-[10001]">
          <div className="speech">
            <b>MYLO is thinking...</b>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-75" />
              <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-150" />
            </div>
          </div>
        </div>
      )}

      {/* ── Do Mode: approval gate ──────────────────────────────────────── */}
      {(doPhase === 'approve' || doPhase === 'executing') && pendingAction && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto z-[10001]">
          <div className="task-card w-[380px]">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer2 size={14} className="text-[var(--blue)]" />
              <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                {pendingAction.actionType}
              </span>
            </div>
            <b className="block text-sm mb-1">{pendingAction.description}</b>
            {pendingAction.x != null && pendingAction.y != null && (
              <small className="opacity-50 font-mono text-xs">
                Target coords: ({pendingAction.x}, {pendingAction.y})
              </small>
            )}
            {doError && <p className="text-red-500 text-xs mt-2">{doError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--blue)] text-white border-2 border-[var(--ink)] px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--green)] hover:text-[var(--ink)] transition-colors disabled:opacity-50"
                onClick={handleApproveAction}
                disabled={doPhase === 'executing'}
              >
                <CheckCircle2 size={12} />
                {doPhase === 'executing' ? 'Executing...' : 'Approve & Run'}
              </button>
              <button
                className="flex items-center gap-2 bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-red-100 transition-colors disabled:opacity-50"
                onClick={handleRejectAction}
                disabled={doPhase === 'executing'}
              >
                <XCircle size={12} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Do Mode: error (when no action found) ──────────────────────── */}
      {doPhase === 'idle' && doError && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto z-[10001]">
          <div className="speech border-red-400">
            <b className="text-red-600">MYLO:</b><br />
            {doError}
            <button
              className="block mt-2 text-xs underline text-gray-500 hover:text-black"
              onClick={() => { setDoError(null); invoke('set_overlay_interactive', { interactive: true }) }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Agentic HUD & Cursor ──────────────────────────────────────── */}
      <AnimatePresence>
        {agentPhase !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-[10002] bg-white border-2 border-[var(--ink)] p-4 rounded-xl shadow-[4px_4px_0_var(--ink)] pointer-events-auto flex items-center gap-4"
          >
            <div className={`w-4 h-4 rounded-full ${agentPhase === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-[var(--blue)] animate-bounce'}`} />
            <div className="font-mono text-sm font-bold text-[var(--ink)] max-w-xs">
              {agentMessage}
            </div>
          </motion.div>
        )}
        
        {agentCursor && (
          <motion.div
            initial={false}
            animate={{ x: agentCursor.x, y: agentCursor.y }}
            transition={{
              type: "tween",
              ease: "easeInOut",
              duration: 0.75,
            }}
            className="fixed z-[10003] pointer-events-none"
            style={{ width: 32, height: 32, marginLeft: -4, marginTop: -4, left: 0, top: 0 }}
          >
            <div className="absolute inset-0 bg-[var(--blue)] rounded-full opacity-30 animate-ping" />
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              className="relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
            >
              <path
                d="M3 3l7 18 3-7 7-3L3 3z"
                fill="#3b82f6"
              />
            </svg>
            <div className="absolute left-6 top-6 bg-[var(--ink)] text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow border border-white">
              MYLO
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay-local CSS ──────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        :root {
          --ink: #1e1e1e;
          --blue: #3b82f6;
          --red: #ef4444;
          --yellow: #fef08a;
          --green: #86efac;
          --paper: #fffef0;
        }
        body { background: transparent !important; }
        .speech {
          position: relative; z-index: 7;
          padding: 12px; background: #fff;
          border: 2px solid var(--ink);
          border-radius: 5px 13px 4px 10px;
          font: 12px/1.4 'Courier New', monospace;
          box-shadow: 3px 3px 0 var(--red);
        }
        .speech b { color: var(--blue); }
        .task-card {
          background: var(--paper);
          border: 2px solid var(--ink);
          border-radius: 4px 12px 4px 8px;
          padding: 16px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          box-shadow: 4px 4px 0 var(--blue);
        }
        input::placeholder { opacity: 0.5; }
      `
      }} />
    </div>
  )
}
