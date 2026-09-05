'use client'

import { useEffect, useState } from 'react'
import { MousePointer2, CheckCircle2, XCircle } from 'lucide-react'
import { RoughCircle } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { askAi, analyzeForDoMode, type DoAction } from '@/lib/ai-client'

type OverlayState = 'hidden' | 'coach' | 'do' | 'ask'

export default function OverlayPage() {
  const [overlayState, setOverlayState] = useState<OverlayState>('ask')
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 })

  // Ask Mode selection state
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  // Do Mode state — holds the structured action waiting for approval
  const [pendingAction, setPendingAction] = useState<DoAction | null>(null)
  const [doError, setDoError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Stream safety indicator
  const [isStreamSafe, setIsStreamSafe] = useState(false)

  useEffect(() => {
    invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(console.error)

    const setupListener = async () => {
      const unlisten = await listen<OverlayState>('overlay-state-changed', (event) => {
        const newState = event.payload
        setOverlayState(newState)

        // Reset per-mode state
        if (newState === 'ask') {
          setSelection(null)
          setAiResponse(null)
          setIsProcessing(false)
          invoke('set_overlay_interactive', { interactive: true })
        } else if (newState === 'do') {
          setPendingAction(null)
          setDoError(null)
          setIsExecuting(false)
          invoke('set_overlay_interactive', { interactive: false })
        } else {
          invoke('set_overlay_interactive', { interactive: false })
        }

        // Re-verify stream safety after every state change
        setTimeout(() => {
          invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(console.error)
        }, 100)
      })
      return unlisten
    }

    let unlistenFn: (() => void) | null = null
    setupListener().then((fn) => (unlistenFn = fn)).catch(console.error)

    // Listen for Do Mode position updates from Coach mode
    const setupPositionListener = async () => {
      const unlisten = await listen<{ x: number; y: number }>('target-pos-changed', (event) => {
        setTargetPos(event.payload)
      })
      return unlisten
    }

    let unlistenPos: (() => void) | null = null
    setupPositionListener().then((fn) => (unlistenPos = fn)).catch(console.error)

    return () => {
      if (unlistenFn) unlistenFn()
      if (unlistenPos) unlistenPos()
    }
  }, [])

  // ── Ask Mode pointer handlers ──────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (overlayState !== 'ask' || selection || isProcessing) return
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    const x = Math.min(startPos.x, currentPos.x)
    const y = Math.min(startPos.y, currentPos.y)
    const w = Math.abs(currentPos.x - startPos.x)
    const h = Math.abs(currentPos.y - startPos.y)

    if (w < 10 || h < 10) return

    setSelection({ x, y, w, h })
    await invoke('set_overlay_interactive', { interactive: false })

    setIsProcessing(true)
    try {
      const base64Img: string | null = await invoke('capture_screen_crop', {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        scaleFactor: window.devicePixelRatio || 1.0,
      })

      if (base64Img) {
        const response = await askAi('What is happening in this circled area? Be brief and direct.', base64Img)
        setAiResponse(response)
      } else {
        setAiResponse('Failed to capture screen region.')
      }
    } catch (err) {
      console.error(err)
      setAiResponse('Error capturing screen or contacting AI.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Do Mode: approve & execute ─────────────────────────────────

  const handleApproveAction = async () => {
    if (!pendingAction || isExecuting) return
    setIsExecuting(true)
    setDoError(null)
    try {
      await invoke('execute_do_action', { action: pendingAction })
      // Hide overlay after successful execution
      await invoke('toggle_overlay', { visible: false, clickThrough: true })
      setOverlayState('hidden')
    } catch (e: any) {
      setDoError(`Action failed: ${e}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleRejectAction = () => {
    setPendingAction(null)
    setDoError(null)
    setOverlayState('ask')
  }

  if (overlayState === 'hidden') return null

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[9999] overflow-hidden bg-transparent ${
        overlayState === 'ask' && !selection && !isProcessing
          ? 'pointer-events-auto cursor-crosshair'
          : 'pointer-events-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── Stream Shield HUD ─────────────────────────────── */}
      {isStreamSafe && (
        <div className="fixed top-4 right-4 bg-[var(--ink)] text-[var(--green)] px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 z-[10000] shadow-[2px_2px_0_var(--green)] border border-[var(--green)] pointer-events-none">
          🔒 Stream Shield Active
        </div>
      )}

      {/* ── Coach Mode ────────────────────────────────────── */}
      {overlayState === 'coach' && (
        <>
          <div className="absolute" style={{ left: targetPos.x - 100, top: targetPos.y - 100, width: 200, height: 200 }}>
            <div className="absolute inset-0 border-4 border-dashed border-[var(--blue)] rounded-full animate-spin-slow opacity-50" />
            <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          </div>
          <div className="absolute" style={{ left: targetPos.x + 80, top: targetPos.y - 80 }}>
            <div className="speech animate-bounce-slight pointer-events-auto">
              <b>MYLO says:</b>
              <br />
              Click here to proceed.
            </div>
          </div>
        </>
      )}

      {/* ── Do Mode — Structured Action Preview Gate ──────── */}
      {overlayState === 'do' && (
        <div className="absolute pointer-events-auto" style={{ left: targetPos.x, top: targetPos.y }}>
          {!pendingAction && !isProcessing ? (
            // Entry: no action yet — show a prompt to circle something
            <div className="speech max-w-xs">
              <b>Do Mode Active</b>
              <br />
              <span className="opacity-70 text-xs">Circle what you want MYLO to interact with, then describe your intent.</span>
            </div>
          ) : isProcessing ? (
            // Loading
            <div className="speech">
              <b>MYLO is analyzing...</b>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-150" />
              </div>
            </div>
          ) : pendingAction ? (
            // Approval card
            <div className="task-card pointer-events-auto max-w-sm">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer2 size={16} className="text-[var(--blue)]" />
                <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                  {pendingAction.action_type}
                </span>
              </div>
              <b className="block mb-1">{pendingAction.description}</b>
              {pendingAction.x != null && pendingAction.y != null && (
                <small className="opacity-60 font-mono">
                  Target: ({pendingAction.x}, {pendingAction.y})
                </small>
              )}
              {doError && <p className="text-red-500 text-xs mt-2">{doError}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  className="flex items-center gap-2 bg-[var(--blue)] text-white border-2 border-[var(--ink)] px-3 py-2 font-mono text-sm font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--green)] hover:text-[var(--ink)] transition-colors"
                  onClick={handleApproveAction}
                  disabled={isExecuting}
                >
                  <CheckCircle2 size={14} />
                  {isExecuting ? 'Running...' : 'Approve'}
                </button>
                <button
                  className="flex items-center gap-2 bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2 font-mono text-sm font-bold shadow-[2px_2px_0_var(--ink)] hover:bg-red-100 transition-colors"
                  onClick={handleRejectAction}
                  disabled={isExecuting}
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          <div className="ghost-cursor mt-8 ml-8">
            <MousePointer2 size={26} />
            <span>safe checkpoint</span>
          </div>
        </div>
      )}

      {/* ── Ask Mode: live draw ───────────────────────────── */}
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

      {/* ── Ask Mode: selection + sticky note ────────────── */}
      {selection && (
        <div
          className="absolute pointer-events-none"
          style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
        >
          <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          <div className="absolute top-0 right-[-320px] ml-4 w-72 pointer-events-auto">
            <div className="speech">
              <b>MYLO says:</b>
              <br />
              {isProcessing ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-75" />
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-150" />
                </div>
              ) : (
                <p className="mt-2 text-sm">{aiResponse}</p>
              )}
              {!isProcessing && (
                <button
                  className="mt-4 text-xs underline text-gray-500 hover:text-black"
                  onClick={() => {
                    setSelection(null)
                    setAiResponse(null)
                    invoke('set_overlay_interactive', { interactive: true })
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ask Mode: hint card ───────────────────────────── */}
      {overlayState === 'ask' && !selection && !isDragging && (
        <div className="absolute bottom-12 right-12">
          <div className="ask-card p-6 pointer-events-auto bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--green)] max-w-sm rounded-lg">
            <b className="text-[var(--ink)] font-sans text-lg block mb-2">Draw to Ask</b>
            <p className="font-mono text-sm opacity-80">
              Click and drag over any part of your screen to capture and ask MYLO about it.
            </p>
          </div>
        </div>
      )}

      {/* ── Overlay-local CSS ─────────────────────────────── */}
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
        .speech {
          position: relative; z-index: 7;
          padding: 10px; background: #fff;
          border: 2px solid var(--ink);
          border-radius: 5px 13px 4px 10px;
          font: 11px/1.35 'Courier New', monospace;
          box-shadow: 3px 3px 0 var(--red);
        }
        .speech b { color: var(--blue); }
        .task-card {
          background: var(--paper);
          border: 2px solid var(--ink);
          border-radius: 4px 12px 4px 8px;
          padding: 14px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          box-shadow: 4px 4px 0 var(--blue);
        }
        .ghost-cursor { position: absolute; color: var(--red); transform: rotate(-12deg); }
        .ghost-cursor span {
          position: absolute; left: 22px; top: 20px; white-space: nowrap; padding: 5px;
          background: var(--yellow); border: 1px solid var(--ink); font: 10px 'Courier New', monospace;
        }
        @keyframes bounce-slight {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slight { animation: bounce-slight 2s infinite ease-in-out; }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `
      }} />
    </div>
  )
}
