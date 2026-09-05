'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, MessageSquare, MousePointer2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  AiError,
  analyzeForDoMode,
  askAi,
  type DoAction,
  type GlobalRect,
  type Provider,
} from '@/lib/ai-client'

type OverlayMode = 'hidden' | 'coach' | 'do' | 'ask'
type DoPhase = 'idle' | 'drawing' | 'intent' | 'analyzing' | 'approve' | 'executing'

interface Selection {
  x: number
  y: number
  w: number
  h: number
}

interface CaptureResult {
  image: string | null
  rect: GlobalRect
}

/** Smallest selection we will act on, in CSS pixels. */
const MIN_SELECTION = 12

/** Time for the compositor to actually take the overlay off screen. */
const HIDE_SETTLE_MS = 120

const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default function OverlayPage() {
  const [mode, setMode] = useState<OverlayMode>('hidden')
  const [provider, setProvider] = useState<Provider>('gemini')

  // ── Drawing ────────────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 })

  // ── Ask ────────────────────────────────────────────────────────────────────
  const [askSelection, setAskSelection] = useState<Selection | null>(null)
  const [askProcessing, setAskProcessing] = useState(false)
  const [askResponse, setAskResponse] = useState<string | null>(null)

  // ── Do ─────────────────────────────────────────────────────────────────────
  const [doPhase, setDoPhase] = useState<DoPhase>('idle')
  const [doSelection, setDoSelection] = useState<Selection | null>(null)
  const [doRect, setDoRect] = useState<GlobalRect | null>(null)
  const [doImage, setDoImage] = useState<string | null>(null)
  const [userIntent, setUserIntent] = useState('')
  const [pendingAction, setPendingAction] = useState<DoAction | null>(null)
  const [doError, setDoError] = useState<string | null>(null)
  const intentInputRef = useRef<HTMLInputElement>(null)

  const [isStreamSafe, setIsStreamSafe] = useState(false)

  const refreshStreamSafety = useCallback(() => {
    if (!isTauri()) return
    invoke<boolean>('verify_stream_safety').then(setIsStreamSafe).catch(() => setIsStreamSafe(false))
  }, [])

  const resetAll = useCallback(() => {
    setAskSelection(null)
    setAskResponse(null)
    setAskProcessing(false)
    setDoPhase('idle')
    setDoSelection(null)
    setDoRect(null)
    setDoImage(null)
    setPendingAction(null)
    setDoError(null)
    setUserIntent('')
    setIsDragging(false)
  }, [])

  const dismissOverlay = useCallback(async () => {
    setMode('hidden')
    resetAll()
    if (!isTauri()) return
    try {
      await invoke('toggle_overlay', { visible: false, clickThrough: true })
    } catch (e) {
      console.error('[MYLO] Could not hide the overlay:', e)
    }
  }, [resetAll])

  /**
   * Whether the overlay needs to swallow mouse input right now.
   *
   * This is the crux of the overlay's interaction model. OS-level
   * click-through is all-or-nothing for the whole window: CSS
   * `pointer-events` only routes events *inside* the webview and cannot make
   * a window that is accepting input pass a click through to the app beneath.
   *
   * So there is exactly one rule — the window accepts input if and only if
   * something on screen needs a click — and it is derived from state in one
   * place. The previous code called `set_overlay_interactive(false)` right
   * before rendering cards with buttons on them, which is why the Do Mode
   * approval gate could never be clicked.
   */
  const needsPointerEvents = useMemo(() => {
    if (mode === 'hidden') return false
    if (mode === 'ask') return !askProcessing
    if (mode === 'do') return doPhase !== 'analyzing' && doPhase !== 'executing'
    // Coach mode is pure annotation — never steal clicks.
    return false
  }, [mode, askProcessing, doPhase])

  // Single writer for OS click-through. Nothing else calls this command.
  useEffect(() => {
    if (!isTauri()) return
    invoke('set_overlay_interactive', { interactive: needsPointerEvents }).catch((e) =>
      console.error('[MYLO] Could not update click-through:', e),
    )
  }, [needsPointerEvents])

  // ── Backend events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | null = null
    let cancelled = false

    refreshStreamSafety()
    invoke<Provider[]>('list_saved_providers')
      .then((saved) => {
        if (!cancelled && saved.length && !saved.includes('gemini')) setProvider(saved[0])
      })
      .catch(() => {})

    listen<OverlayMode>('overlay-state-changed', (event) => {
      const next = event.payload
      setMode(next)
      resetAll()
      refreshStreamSafety()
    })
      .then((fn) => {
        // The effect may have been torn down while `listen` was in flight.
        if (cancelled) fn()
        else unlisten = fn
      })
      .catch((e) => console.error('[MYLO] Could not subscribe to overlay events:', e))

    return () => {
      cancelled = true
      if (unlisten) unlisten()
    }
  }, [refreshStreamSafety, resetAll])

  // ── Escape to dismiss ──────────────────────────────────────────────────────
  //
  // A webview key listener only fires while the overlay has focus, so this is
  // a convenience, not the kill switch. The real kill switch is the global
  // panic hotkey registered in hotkey.rs, which works even when MYLO has no
  // focus at all.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        void dismissOverlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissOverlay])

  // ── Capture ────────────────────────────────────────────────────────────────

  /**
   * Capture a selection.
   *
   * Coordinates go to the backend as plain CSS pixels relative to this window.
   * The backend converts them using the window's real position and scale
   * factor; `window.devicePixelRatio` is not used, because it reports the
   * scale of the display the *webview* thinks it is on and is wrong the moment
   * the overlay sits on a secondary monitor with different scaling.
   */
  const capture = async (sel: Selection): Promise<CaptureResult> =>
    invoke<CaptureResult>('capture_screen_crop', {
      x: sel.x,
      y: sel.y,
      width: sel.w,
      height: sel.h,
    })

  // ── Pointer handling ───────────────────────────────────────────────────────

  const canDraw =
    (mode === 'ask' && !askSelection && !askProcessing) ||
    (mode === 'do' && (doPhase === 'idle' || doPhase === 'drawing'))

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canDraw || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragCurrent({ x: e.clientX, y: e.clientY })
    if (mode === 'do') setDoPhase('drawing')
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setDragCurrent({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsDragging(false)

    const sel: Selection = {
      x: Math.min(dragStart.x, dragCurrent.x),
      y: Math.min(dragStart.y, dragCurrent.y),
      w: Math.abs(dragCurrent.x - dragStart.x),
      h: Math.abs(dragCurrent.y - dragStart.y),
    }

    if (sel.w < MIN_SELECTION || sel.h < MIN_SELECTION) {
      if (mode === 'do') setDoPhase('idle')
      return
    }

    if (mode === 'ask') {
      setAskSelection(sel)
      await runAsk(sel)
    } else if (mode === 'do') {
      setDoSelection(sel)
      setDoPhase('intent')
      // Focus after paint so the input exists.
      requestAnimationFrame(() => intentInputRef.current?.focus())
    }
  }

  // ── Ask flow ───────────────────────────────────────────────────────────────

  const runAsk = async (sel: Selection) => {
    setAskProcessing(true)
    setAskResponse(null)
    try {
      const { image } = await capture(sel)
      if (!image) {
        setAskResponse('Nothing to capture in that region.')
        return
      }
      setAskResponse(await askAi('What is in this region? Be brief and direct.', image, provider))
    } catch (err) {
      console.error('[MYLO] Ask failed:', err)
      setAskResponse(
        err instanceof AiError ? err.message : `Could not complete the request: ${String(err)}`,
      )
    } finally {
      setAskProcessing(false)
    }
  }

  // ── Do flow ────────────────────────────────────────────────────────────────

  const runDoAnalyze = async () => {
    if (!doSelection || !userIntent.trim()) return
    setDoPhase('analyzing')
    setDoError(null)

    try {
      const { image, rect } = await capture(doSelection)
      if (!image) {
        setDoError('Nothing to capture in that region.')
        setDoPhase('idle')
        return
      }

      setDoImage(image)
      setDoRect(rect)

      const action = await analyzeForDoMode(image, userIntent, rect, provider)
      if (!action) {
        setDoError(
          "MYLO could not identify a safe action. Try selecting a smaller region or describing the target more precisely.",
        )
        setDoPhase('idle')
        return
      }

      setPendingAction(action)
      setDoPhase('approve')
    } catch (err) {
      console.error('[MYLO] Do analysis failed:', err)
      setDoError(err instanceof AiError ? err.message : `Analysis failed: ${String(err)}`)
      setDoPhase('idle')
    }
  }

  /**
   * Approve and run.
   *
   * Order matters. The overlay is a full-screen window, so a synthetic click
   * fired while it is on screen lands on the overlay rather than the app
   * underneath. The window is hidden and given a frame to actually disappear
   * before the input is injected — and the backend independently refuses to
   * inject anything while the overlay is still visible.
   */
  const handleApproveAction = async () => {
    if (!pendingAction) return
    setDoPhase('executing')
    setDoError(null)

    try {
      await invoke('approve_do_action', { action: pendingAction })
      await invoke('toggle_overlay', { visible: false, clickThrough: true })
      await new Promise((resolve) => setTimeout(resolve, HIDE_SETTLE_MS))
      await invoke('execute_do_action', { action: pendingAction })
      setMode('hidden')
      resetAll()
    } catch (e) {
      // Bring the overlay back so the failure is visible rather than silent.
      try {
        await invoke('toggle_overlay', { visible: true, clickThrough: false })
      } catch {
        /* the overlay is gone; the error is still logged below */
      }
      console.error('[MYLO] Action failed:', e)
      setDoError(`Action failed: ${String(e)}`)
      setDoPhase('approve')
    }
  }

  const handleRejectAction = () => {
    if (isTauri()) invoke('cancel_do_action').catch(() => {})
    setPendingAction(null)
    setDoError(null)
    setDoSelection(null)
    setDoRect(null)
    setDoImage(null)
    setUserIntent('')
    setDoPhase('idle')
  }

  const retryWithSameCapture = async () => {
    if (!doImage || !doRect) {
      handleRejectAction()
      return
    }
    setDoPhase('analyzing')
    setDoError(null)
    try {
      const action = await analyzeForDoMode(doImage, userIntent, doRect, provider)
      if (!action) {
        setDoError('Still no safe action. Try rephrasing your intent.')
        setDoPhase('intent')
        return
      }
      setPendingAction(action)
      setDoPhase('approve')
    } catch (err) {
      setDoError(err instanceof AiError ? err.message : String(err))
      setDoPhase('intent')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (mode === 'hidden') return null

  const liveBox = isDragging
    ? {
        left: Math.min(dragStart.x, dragCurrent.x),
        top: Math.min(dragStart.y, dragCurrent.y),
        width: Math.abs(dragCurrent.x - dragStart.x),
        height: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null

  const modeLabel =
    mode === 'ask'
      ? askProcessing
        ? 'ASK — thinking'
        : askSelection
          ? 'ASK — answer ready'
          : 'ASK — drag to select'
      : mode === 'do'
        ? `DO — ${doPhase === 'idle' ? 'drag around the target' : doPhase}`
        : 'COACH'

  return (
    <div
      className={`overlay-root ${canDraw ? 'is-drawable' : ''} ${
        needsPointerEvents ? 'pointer-auto' : 'pointer-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Stream shield — reflects a real read of the window's capture state,
          on both platforms. It says "off" when it is off. */}
      <div className="hud hud-top-right">
        <span className={`hud-pill ${isStreamSafe ? 'safe' : 'unsafe'}`}>
          {isStreamSafe ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {isStreamSafe ? 'Stream Shield active' : 'Visible to screen capture'}
        </span>
      </div>

      <div className="hud hud-top-left">
        <div className="hud-mode">● {modeLabel}</div>
        <div className="hud-hint">Esc to dismiss</div>
      </div>

      {/* Live selection */}
      {liveBox && <div className="selection" style={liveBox} />}

      {/* Frozen selections */}
      {mode === 'ask' && askSelection && !isDragging && (
        <div
          className="selection frozen"
          style={{
            left: askSelection.x,
            top: askSelection.y,
            width: askSelection.w,
            height: askSelection.h,
          }}
        />
      )}
      {mode === 'do' && doSelection && doPhase !== 'idle' && doPhase !== 'drawing' && (
        <div
          className="selection frozen"
          style={{
            left: doSelection.x,
            top: doSelection.y,
            width: doSelection.w,
            height: doSelection.h,
          }}
        />
      )}

      {/* Ask answer */}
      {mode === 'ask' && askSelection && (
        <div
          className="card-anchor pointer-auto"
          style={{ bottom: undefined, top: Math.min(askSelection.y, window.innerHeight - 260) }}
        >
          <div className="speech">
            <b>MYLO says:</b>
            {askProcessing ? (
              <div className="dots">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{askResponse}</p>
            )}
            {!askProcessing && (
              <button
                className="link-button"
                onClick={() => {
                  setAskSelection(null)
                  setAskResponse(null)
                }}
              >
                Select something else
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ask idle hint */}
      {mode === 'ask' && !askSelection && !isDragging && (
        <div className="card-anchor pointer-none">
          <div className="task-card">
            <b>Drag to ask</b>
            <p style={{ marginTop: 6, opacity: 0.7 }}>
              Click and drag a box around anything on screen.
            </p>
          </div>
        </div>
      )}

      {/* Do — intent */}
      {mode === 'do' && doPhase === 'intent' && (
        <div className="card-anchor pointer-auto">
          <div className="task-card">
            <div className="card-label">
              <MessageSquare size={13} /> What should MYLO do?
            </div>
            <input
              ref={intentInputRef}
              className="text-input"
              type="text"
              value={userIntent}
              maxLength={200}
              placeholder="e.g. Click the Export button"
              onChange={(e) => setUserIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runDoAnalyze()
                if (e.key === 'Escape') handleRejectAction()
              }}
            />
            <div className="button-row">
              <button
                className="btn btn-primary"
                onClick={runDoAnalyze}
                disabled={!userIntent.trim()}
              >
                <CheckCircle2 size={12} /> Analyze
              </button>
              <button className="btn btn-danger" onClick={handleRejectAction}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Do — analyzing */}
      {mode === 'do' && doPhase === 'analyzing' && (
        <div className="card-anchor pointer-none">
          <div className="speech">
            <b>MYLO is looking…</b>
            <div className="dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {/* Do — approval gate */}
      {mode === 'do' && (doPhase === 'approve' || doPhase === 'executing') && pendingAction && (
        <div className="card-anchor pointer-auto">
          <div className="task-card">
            <div className="card-label">
              <MousePointer2 size={13} /> {pendingAction.actionType}
            </div>
            <b>{pendingAction.description}</b>
            {pendingAction.x != null && pendingAction.y != null && (
              <small className="card-meta">
                Target: ({pendingAction.x}, {pendingAction.y}) on screen
              </small>
            )}
            {pendingAction.actionType === 'type' && pendingAction.text && (
              <small className="card-meta">Types: &ldquo;{pendingAction.text}&rdquo;</small>
            )}
            {doError && <p className="card-error">{doError}</p>}
            <div className="button-row">
              <button
                className="btn btn-primary"
                onClick={handleApproveAction}
                disabled={doPhase === 'executing'}
              >
                <CheckCircle2 size={12} />
                {doPhase === 'executing' ? 'Running…' : 'Approve & run'}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectAction}
                disabled={doPhase === 'executing'}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Do — error */}
      {mode === 'do' && doPhase === 'idle' && doError && (
        <div className="card-anchor pointer-auto">
          <div className="speech error">
            <b style={{ color: 'var(--red)' }}>MYLO:</b>
            <p style={{ marginTop: 6 }}>{doError}</p>
            <div className="button-row">
              {doImage && (
                <button className="btn btn-primary" onClick={retryWithSameCapture}>
                  Try again
                </button>
              )}
              <button className="btn" onClick={handleRejectAction}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach */}
      {mode === 'coach' && (
        <div className="card-anchor pointer-none">
          <div className="speech">
            <b>Coach mode</b>
            <p style={{ marginTop: 6 }}>
              Step-by-step guidance is not wired up yet. Use Ask or Do for now.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
