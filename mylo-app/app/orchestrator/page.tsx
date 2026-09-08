'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity, Square, Terminal, Globe, Cpu, Copy, Check, Trash2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

type LogPayload = {
  agent_id: string;
  message: string;
}

type StatusPayload = {
  agent_id: string;
  status: string;
}

export default function Orchestrator() {
  const [logs, setLogs] = useState<{ time: string, msg: string }[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [taskPrompt, setTaskPrompt] = useState('Scrape Lead Gen (LinkedIn)')
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const terminalContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = terminalContainerRef.current
    if (!el) return

    // Check if user is near bottom before auto-scrolling
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 60
    if (isNearBottom) {
      logsEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [logs])

  useEffect(() => {
    let isCancelled = false
    let unlistenLog: (() => void) | null = null
    let unlistenStatus: (() => void) | null = null

    const formatTimestamp = () => {
      const now = new Date()
      return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
    }

    const setupListeners = async () => {
      if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
        try {
          const uLog = await listen<LogPayload>('agent_log', (event) => {
            const timeString = formatTimestamp()
            setLogs(prev => [...prev, { time: timeString, msg: event.payload.message }].slice(-300))
          })
          if (isCancelled) {
            uLog()
          } else {
            unlistenLog = uLog
          }

          const uStatus = await listen<StatusPayload>('agent_status', (event) => {
            const status = event.payload.status
            if (status === 'completed' || status === 'killed' || status === 'error') {
              setIsRunning(false)
              const timeString = formatTimestamp()
              setLogs(prev => [
                ...prev,
                { time: timeString, msg: `--- AGENT STATUS: ${status.toUpperCase()} (${event.payload.agent_id}) ---` }
              ].slice(-300))
            }
          })
          if (isCancelled) {
            uStatus()
          } else {
            unlistenStatus = uStatus
          }
        } catch (e) {
          console.error('Failed to setup agent listeners:', e)
        }
      }
    }
    setupListeners()

    return () => {
      isCancelled = true
      if (unlistenLog) unlistenLog()
      if (unlistenStatus) unlistenStatus()
    }
  }, [])

  const handleSpawn = async () => {
    const agentId = `agent-${Date.now().toString(36).slice(-5).toUpperCase()}`
    setCurrentAgentId(agentId)
    setIsRunning(true)
    const now = new Date()
    const timeString = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
    setLogs(prev => [...prev, { time: timeString, msg: `--- SPAWNING NEW HEADLESS AGENT (${agentId}) ---` }].slice(-300))
    try {
      if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
        await invoke('spawn_headless_agent', { 
          agentId, 
          task: taskPrompt.trim() || 'Scrape Lead Gen (LinkedIn)' 
        })
      }
    } catch (e) {
      console.error('Error spawning headless agent:', e)
      setIsRunning(false)
    }
  }

  const handleKill = async () => {
    if (!currentAgentId) {
      if (typeof window !== 'undefined') {
        alert('No agent is currently selected.')
      }
      return
    }
    setIsRunning(false)
    const agentId = currentAgentId
    const now = new Date()
    const timeString = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`
    setLogs(prev => [...prev, { time: timeString, msg: `--- KILL SIGNAL DISPATCHED (${agentId}) ---` }].slice(-300))
    try {
      if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
        await invoke('kill_headless_agent', { agentId })
      }
    } catch (e) {
      console.error('Error killing headless agent:', e)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleCopyLogs = async () => {
    const text = logs.map(l => (l.time ? `${l.time} ` : '') + l.msg).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy logs to clipboard:', e)
    }
  }

  return (
    <main className="pb-32 bg-[var(--paper)] h-screen overflow-y-auto">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl">✳</span>
          <span><strong>MYLO</strong><small>[orchestrator]</small></span>
        </Link>
        <div className="nav-actions">
          <Link href="/" className="nav-back-link">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="shell pt-12 pb-8">
        <div className="status-wrap mb-4">
          <div className="status" style={{ backgroundColor: 'var(--blue)', color: 'white', borderColor: 'var(--ink)' }}>
            <Activity size={14} className="mr-2" /> V2 // GHOST IN THE MACHINE
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 54px)', maxWidth: '800px', lineHeight: 1 }}>
          Background <em>Orchestrator</em>.
        </h1>
        <p className="lede">
          MYLO isn&apos;t just a foreground pointer anymore. Spawn headless HTTP browser agents that run completely unseen.
        </p>
      </section>

      {/* Mission Control Panel */}
      <section className="shell pb-16">
        <div className="mode-panel blue shadow-[8px_8px_0_var(--ink)]" style={{ gridTemplateColumns: '1fr', padding: '24px', gap: '24px' }}>
          
          <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8">
            {/* Left Column: Agent List */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-2 mb-2">
                <h3 className="text-xl font-bold font-['Trebuchet_MS'] m-0">Active Agents</h3>
                <span className="text-xs font-['Courier_New'] font-bold bg-[var(--green)] px-2 py-1 border border-[var(--ink)]">
                  {isRunning ? '1 RUNNING' : '0 RUNNING'}
                </span>
              </div>

              {/* Custom Task Prompt Input */}
              <div className="bg-white border-2 border-[var(--ink)] rounded-[6px_3px_8px_4px] p-3.5 shadow-[3px_3px_0_var(--ink)] flex flex-col gap-1.5">
                <label htmlFor="task-prompt-input" className="text-xs font-bold font-['Courier_New'] text-[var(--ink)] uppercase tracking-wide">
                  Task Prompt
                </label>
                <input
                  id="task-prompt-input"
                  type="text"
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="e.g. Scrape Lead Gen (LinkedIn)"
                  disabled={isRunning}
                  className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2 text-xs font-mono rounded shadow-[2px_2px_0_var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] disabled:opacity-60"
                />
              </div>

              {/* Agent 1 */}
              <div className={`bg-white border-2 border-[var(--ink)] rounded-[6px_3px_8px_4px] p-4 shadow-[3px_3px_0_var(--ink)] hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--ink)] transition-all transform ${isRunning ? '-rotate-1 opacity-100' : 'rotate-1 opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-['Courier_New'] text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                    <Globe size={12} className="text-[var(--blue)]" /> ID: {currentAgentId || 'READY'}
                  </span>
                  <span className={`w-2 h-2 rounded-full border border-[var(--ink)] ${isRunning ? 'bg-[var(--green)] animate-pulse' : 'bg-gray-400'}`}></span>
                </div>
                <strong className="block text-sm mb-2 break-words">{taskPrompt.trim() || 'Scrape Lead Gen (LinkedIn)'}</strong>
                {isRunning && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleKill}
                      className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[5px_3px_6px_4px] py-1 text-xs font-bold font-['Courier_New'] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Square size={12} /> KILL
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSpawn}
                disabled={isRunning}
                className="mt-2 w-full border-2 border-dashed border-[var(--ink)] rounded-[8px_4px_6px_3px] py-3 text-xs font-bold font-['Courier_New'] text-[var(--ink)] hover:bg-[var(--yellow)] hover:border-solid transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Cpu size={14} /> + SPAWN HEADLESS AGENT
              </button>
            </div>

            {/* Right Column: Terminal Logs */}
            <div className="bg-[#1e1e1e] border-2 border-[var(--ink)] rounded-[8px_5px_12px_6px] p-5 flex flex-col transform shadow-[5px_5px_0_var(--ink)] overflow-hidden h-[450px]">
              <div className="flex items-center justify-between gap-4 mb-4 border-b border-[#333] pb-3 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-[#888] font-['Courier_New'] text-xs flex items-center gap-2">
                    <Terminal size={12} /> HEADLESS_HTTP_AGENT // LIVE LOGS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLogs}
                    title="Copy logs to clipboard"
                    className="text-[#aaa] hover:text-white border border-[#444] hover:border-[#666] bg-[#2a2a2a] px-2 py-1 rounded text-[10px] font-['Courier_New'] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleClearLogs}
                    title="Clear logs"
                    className="text-[#aaa] hover:text-white border border-[#444] hover:border-[#666] bg-[#2a2a2a] px-2 py-1 rounded text-[10px] font-['Courier_New'] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                </div>
              </div>
              
              <div 
                ref={terminalContainerRef}
                className="flex-1 font-['Courier_New'] text-xs leading-relaxed overflow-y-auto text-[#e0e0e0] flex flex-col gap-2"
              >
                {logs.length === 0 && (
                  <div className="text-[#888] italic">Awaiting task initialization...</div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.msg.includes('SUCCESS') || log.msg.includes('Extracted') ? 'text-green-400' :
                    log.msg.includes('AGENT REASONING') ? 'text-blue-400' :
                    log.msg.includes('WARNING') ? 'text-yellow-400' :
                    log.msg.includes('KILL') || log.msg.includes('TERMINATED') ? 'text-red-400' :
                    'text-[#aaa]'
                  }>
                    <span className="text-[#888] mr-2">{log.time}</span>
                    {log.msg}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
