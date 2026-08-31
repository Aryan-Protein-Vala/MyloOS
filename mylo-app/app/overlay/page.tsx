'use client'

import { useEffect, useState } from 'react'
import { Mic2, MousePointer2, AlertCircle } from 'lucide-react'
import { RoughArrow, RoughCircle } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

type OverlayState = 'hidden' | 'coach' | 'do' | 'ask'

export default function OverlayPage() {
  const [overlayState, setOverlayState] = useState<OverlayState>('ask') // Default for dev testing
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 }) // Example static position

  useEffect(() => {
    // Listen for state changes from the Rust backend (e.g. triggered by global shortcut)
    const setupListener = async () => {
      const unlisten = await listen<OverlayState>('overlay-state-changed', (event) => {
        setOverlayState(event.payload)
      })
      return unlisten
    }
    
    let unlistenFn: (() => void) | null = null
    setupListener().then(fn => unlistenFn = fn).catch(console.error)

    return () => {
      if (unlistenFn) unlistenFn()
    }
  }, [])

  if (overlayState === 'hidden') return null

  return (
    <div className="fixed inset-0 w-screen h-screen pointer-events-none z-[9999] overflow-hidden bg-transparent">
      
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

      {overlayState === 'ask' && (
        <div className="absolute bottom-12 right-12">
          <div className="ask-card p-6 pointer-events-auto bg-white border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--green)] max-w-sm rounded-lg">
            <div className="audio flex items-center gap-1 mb-4 h-6">
              <span className="w-1 h-3 bg-[var(--red)] inline-block animate-pulse"></span>
              <span className="w-1 h-6 bg-[var(--red)] inline-block animate-pulse delay-75"></span>
              <span className="w-1 h-2 bg-[var(--red)] inline-block animate-pulse delay-150"></span>
              <span className="w-1 h-4 bg-[var(--red)] inline-block animate-pulse delay-200"></span>
            </div>
            <b className="text-[var(--ink)] font-sans text-lg block mb-2">Listening...</b>
            <p className="font-mono text-sm opacity-80">I can see your screen. Highlight anything and ask a question.</p>
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
