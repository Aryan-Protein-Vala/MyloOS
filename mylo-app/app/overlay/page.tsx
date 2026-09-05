'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MousePointer2, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import { RoughCircle } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { askAi, analyzeForDoMode, type DoAction } from '@/lib/ai-client'

type OverlayMode = 'hidden' | 'coach' | 'do' | 'ask'

interface Selection {
  x: number
  y: number
  w: number
  h: number
}

export default function OverlayPage() {
  const [mode, setMode] = useState<OverlayMode>('ask')
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

  // ── Stream safety ──────────────────────────────────────────────────────────
  const [isStreamSafe, setIsStreamSafe] = useState(false)

  // ── Double-Esc dismiss ─────────────────────────────────────────────────────
  const lastEscTime = useRef(0)

  const dismissOverlay = useCallback(async () => {
    setMode('hidden')
    setAskSelection(null)
    setAskResponse(null)
    setAskProcessing(false)
    setDoPhase('idle')
    setDoSelection(null)
    setPendingAction(null)
    setDoError(null)
    setUserIntent('')
    await invoke('toggle_overlay', { visible: false, clickThrough: true })
  }, [])

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(console.error)
    }

    let unlistenState: (() => void) | null = null
    let unlistenTarget: (() => void) | null = null

    const setup = async () => {
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return

      // Overlay state from hotkeys
      unlistenState = await listen<OverlayMode>('overlay-state-changed', (event) => {
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
          invoke('set_overlay_interactive', { interactive: false })
        } else {
          invoke('set_overlay_interactive', { interactive: false })
        }

        setTimeout(() => {
          invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(console.error)
        }, 100)
      })

      // Coach mode target position updates
      unlistenTarget = await listen<{ x: number; y: number }>('target-pos-changed', (event) => {
        setTargetPos(event.payload)
      })
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
      if (unlistenState) unlistenState()
      if (unlistenTarget) unlistenTarget()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dismissOverlay])

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
      await invoke('set_overlay_interactive', { interactive: false })
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
      // Switch to non-drawing pointer so the intent input is reachable
      await invoke('set_overlay_interactive', { interactive: false })
      // Re-enable pointer events for the intent card only (it's pointer-events-auto)
      setTimeout(() => intentInputRef.current?.focus(), 100)
    }
  }

  // ── Ask Mode: capture + AI ─────────────────────────────────────────────────

  const runAskCapture = async (sel: Selection) => {
    setAskProcessing(true)
    try {
      const base64Img: string | null = await invoke('capture_screen_crop', {
        x: Math.max(0, Math.round(sel.x)),
        y: Math.max(0, Math.round(sel.y)),
        width: Math.round(sel.w),
        height: Math.round(sel.h),
        scaleFactor: window.devicePixelRatio || 1.0,
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
      const base64Img: string | null = await invoke('capture_screen_crop', {
        x: Math.max(0, Math.round(doSelection.x)),
        y: Math.max(0, Math.round(doSelection.y)),
        width: Math.round(doSelection.w),
        height: Math.round(doSelection.h),
        scaleFactor: window.devicePixelRatio || 1.0,
      })

      if (!base64Img) {
        setDoError('Failed to capture screen region.')
        setDoPhase('idle')
        return
      }

      const action = await analyzeForDoMode(base64Img, userIntent)

      if (!action) {
        setDoError("MYLO couldn't determine a safe action. Try again with a more specific intent.")
        setDoPhase('idle')
        return
      }

      setPendingAction(action)
      setDoPhase('approve')
    } catch (err) {
      console.error(err)
      setDoError('Error analyzing intent.')
      setDoPhase('idle')
    }
  }

  const handleApproveAction = async () => {
    if (!pendingAction) return
    setDoPhase('executing')
    setDoError(null)
    try {
      await invoke('execute_do_action', { action: pendingAction })
      await dismissOverlay()
    } catch (e: any) {
      setDoError(`Action failed: ${e}`)
      setDoPhase('approve')
    }
  }

  const handleRejectAction = () => {
    setPendingAction(null)
    setDoError(null)
    setDoSelection(null)
    setDoPhase('idle')
    invoke('set_overlay_interactive', { interactive: true })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (mode === 'hidden') return null

  const isDoDrawing = mode === 'do' && (doPhase === 'idle' || doPhase === 'drawing')
  const needsPointerEvents =
    (mode === 'ask' && isAskDrawable) ||
    isDoDrawing ||
    mode === 'do' // do mode cards are pointer-events-auto individually

  return (
    <div
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
          <div className="absolute top-0 right-[-320px] w-72 pointer-events-auto">
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
                if (e.key === 'Escape') handleRejectAction()
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
                {pendingAction.action_type}
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
