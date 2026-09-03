'use client'

import { useEffect, useState, useRef } from 'react'
import { Mic2, MousePointer2, AlertCircle } from 'lucide-react'
import { RoughArrow, RoughCircle } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { askAi } from '@/lib/ai-client'

type OverlayState = 'hidden' | 'coach' | 'do' | 'ask'

export default function OverlayPage() {
  const [overlayState, setOverlayState] = useState<OverlayState>('ask')
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 })
  
  // Selection state
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<OverlayState>('overlay-state-changed', (event) => {
        setOverlayState(event.payload)
        // Reset state when hiding or opening
        if (event.payload === 'ask') {
          setSelection(null)
          setAiResponse(null)
          setIsProcessing(false)
          // Make it interactive so we can draw
          invoke('set_overlay_interactive', { interactive: true })
        } else {
          invoke('set_overlay_interactive', { interactive: false })
        }
      })
      return unlisten
    }
    
    let unlistenFn: (() => void) | null = null
    setupListener().then(fn => unlistenFn = fn).catch(console.error)

    return () => {
      if (unlistenFn) unlistenFn()
    }
  }, [])

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

    // Ignore tiny clicks
    if (w < 10 || h < 10) return

    setSelection({ x, y, w, h })
    
    // Stop being interactive to pass clicks to underlying apps again
    await invoke('set_overlay_interactive', { interactive: false })
    
    // Process capture
    setIsProcessing(true)
    try {
      const base64Img: string | null = await invoke('capture_screen_crop', { 
        x: Math.round(x), 
        y: Math.round(y), 
        width: Math.round(w), 
        height: Math.round(h) 
      })

      if (base64Img) {
        const response = await askAi("What is happening in this circled area? Keep it extremely brief.", base64Img)
        setAiResponse(response)
      } else {
        setAiResponse("Failed to capture screen.")
      }
    } catch (err) {
      console.error(err)
      setAiResponse("Error capturing screen or contacting AI.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (overlayState === 'hidden') return null

  return (
    <div 
      className={`fixed inset-0 w-screen h-screen z-[9999] overflow-hidden bg-transparent ${
        overlayState === 'ask' && !selection && !isProcessing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      
      {overlayState === 'coach' && (
        <>
          <div className="absolute" style={{ left: targetPos.x - 100, top: targetPos.y - 100, width: 200, height: 200 }}>
            <div className="absolute inset-0 border-4 border-dashed border-[var(--blue)] rounded-full animate-spin-slow opacity-50" />
            <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          </div>
          <div className="absolute" style={{ left: targetPos.x + 80, top: targetPos.y - 80 }}>
            <div className="speech animate-bounce-slight pointer-events-auto">
              <b>MYLO says:</b><br />
              Click here to proceed.
            </div>
          </div>
        </>
      )}

      {overlayState === 'do' && (
        <div className="absolute" style={{ left: targetPos.x, top: targetPos.y }}>
          <div className="task-card pointer-events-auto">
            <MousePointer2 size={19} className="text-[var(--blue)]" />
            <b>Rename 12 project files</b>
            <small>MYLO is ready to help</small>
            <button 
              className="mini-approve hover:bg-[var(--yellow)] transition-colors mt-4 bg-[var(--blue)] border-2 border-[var(--ink)] p-2 font-mono text-sm font-bold flex items-center gap-2"
              onClick={() => invoke('approve_do_action')}
            >
              Approve 
            </button>
          </div>
          <div className="ghost-cursor mt-8 ml-8">
            <MousePointer2 size={26} />
            <span>safe checkpoint</span>
          </div>
        </div>
      )}

      {/* Drawing the selection box */}
      {isDragging && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y)
          }}
        >
          <div className="absolute inset-0 bg-[var(--blue)] opacity-10 rounded-full" />
          <RoughCircle className="text-[var(--blue)] drop-shadow-md" />
        </div>
      )}

      {/* Selected Box + AI Response */}
      {selection && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.w,
            height: selection.h
          }}
        >
          <RoughCircle className="text-[var(--red)] drop-shadow-md" />
          {/* Sticky Note attached to the selection */}
          <div className="absolute top-0 right-[-320px] ml-4 w-72 pointer-events-auto">
            <div className="speech">
              <b>MYLO says:</b><br />
              {isProcessing ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-[var(--blue)] rounded-full animate-bounce delay-150"></span>
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

      {overlayState === 'ask' && !selection && !isDragging && (
        <div className="absolute bottom-12 right-12">
          <div className="ask-card p-6 pointer-events-auto bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--green)] max-w-sm rounded-lg">
            <b className="text-[var(--ink)] font-sans text-lg block mb-2">Draw to Ask</b>
            <p className="font-mono text-sm opacity-80">Click and drag over any part of your screen to capture and ask MYLO about it.</p>
          </div>
        </div>
      )}
      
      {/* Global CSS required for the overlay specific animations since we might not have layout.tsx doing it */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --ink: #1e1e1e;
          --blue: #3b82f6;
          --red: #ef4444;
          --yellow: #fef08a;
          --green: #86efac;
        }
        .speech {
          position: relative;
          z-index: 7;
          padding: 10px;
          background: #fff;
          border: 2px solid var(--ink);
          border-radius: 5px 13px 4px 10px;
          font: 11px/1.35 'Courier New', monospace;
          box-shadow: 3px 3px 0 var(--red);
        }
        .speech b { color: var(--blue); }
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
      `}} />
    </div>
  )
}
