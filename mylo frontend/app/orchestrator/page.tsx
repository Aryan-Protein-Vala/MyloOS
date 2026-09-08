'use client';
import Link from 'next/link'
import { ArrowLeft, Activity, Play, Pause, Square, Terminal, Globe, Cpu, Copy, Check, Trash2, X } from 'lucide-react'
import { useEffect, useState, useRef } from 'react';
import { 
  getActiveAgents, 
  ActiveAgent, 
  killAgent, 
  spawnAgent, 
  AgentLogPayload, 
  AgentStatusPayload,
  isTauri
} from '../../lib/tauri-ipc';

interface TerminalLog {
  id: string;
  timestamp: string;
  agentId?: string;
  message: string;
  level?: 'info' | 'success' | 'warn' | 'error' | 'reasoning';
}

function classifyLogLevel(msg: string): 'info' | 'success' | 'warn' | 'error' | 'reasoning' {
  const upper = msg.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('PANICKED') || upper.includes('FAIL') || upper.includes('KILLED')) return 'error';
  if (upper.includes('SUCCESS') || upper.includes('EXTRACTED') || upper.includes('COMPLETE') || upper.includes('DONE')) return 'success';
  if (upper.includes('WAITING') || upper.includes('WARN') || upper.includes('PAUSE') || upper.includes('RETRY')) return 'warn';
  if (upper.includes('REASONING') || upper.includes('ANALYZING') || upper.includes('NAVIGATING') || upper.includes('DOM')) return 'reasoning';
  return 'info';
}

const INITIAL_LOGS: TerminalLog[] = [
  { id: '1', timestamp: '10:42:01', agentId: '894F-2A', message: 'Initialization sequence started...', level: 'info' },
  { id: '2', timestamp: '10:42:02', agentId: '894F-2A', message: 'Spawning headless Chromium instance (Puppeteer)', level: 'info' },
  { id: '3', timestamp: '10:42:03', agentId: '894F-2A', message: 'SUCCESS: Browser spawned (PID: 8492)', level: 'success' },
  { id: '4', timestamp: '10:42:03', agentId: '894F-2A', message: 'Navigating to https://linkedin.com/search/results/people/', level: 'reasoning' },
  { id: '5', timestamp: '10:42:05', agentId: '894F-2A', message: 'Injecting session cookies...', level: 'info' },
  { id: '6', timestamp: '10:42:06', agentId: '894F-2A', message: 'Applying filters: "Founder", "San Francisco", "AI"', level: 'info' },
  { id: '7', timestamp: '10:42:08', agentId: '894F-2A', message: 'Scanning page 1/50...', level: 'info' },
  { id: '8', timestamp: '10:42:10', agentId: '894F-2A', message: 'AGENT REASONING: Found 10 profiles. Extracting data via DOM tree traversal.', level: 'reasoning' },
  { id: '9', timestamp: '10:42:12', agentId: '894F-2A', message: 'Extracted: Sarah Jenkins (CEO @ TechFlow)', level: 'success' },
  { id: '10', timestamp: '10:42:12', agentId: '894F-2A', message: 'Extracted: Mark Zhang (Founder @ DataMesh)', level: 'success' },
  { id: '11', timestamp: '10:42:12', agentId: '894F-2A', message: 'Extracted: Elara Vance (Co-Founder @ NeuralNet)', level: 'success' },
  { id: '12', timestamp: '10:42:14', agentId: '894F-2A', message: 'Clicking "Next Page"...', level: 'info' },
  { id: '13', timestamp: '10:42:15', agentId: '894F-2A', message: 'Waiting for network idle (500ms)...', level: 'warn' },
];

export default function Orchestrator() {
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [logs, setLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState('Scrape Lead Gen (LinkedIn)');
  const [isSpawning, setIsSpawning] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const userNearBottomRef = useRef<boolean>(true);

  // Auto-scroll when user is near bottom
  const handleTerminalScroll = () => {
    if (!terminalBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalBodyRef.current;
    userNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (userNearBottomRef.current && terminalBodyRef.current) {
      terminalBodyRef.current.scrollTo({
        top: terminalBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  // Listen to Tauri real-time events
  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    let mounted = true;

    async function registerListeners() {
      try {
        if (!isTauri()) return;

        const { listen } = await import('@tauri-apps/api/event');

        const unLog = await listen<AgentLogPayload>('agent_log', (event) => {
          if (!mounted) return;
          const payload = event.payload;
          const timestamp = new Date().toTimeString().split(' ')[0];
          setLogs(prev => {
            const entry: TerminalLog = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp,
              agentId: payload.agent_id,
              message: payload.message,
              level: classifyLogLevel(payload.message),
            };
            const next = [...prev, entry];
            return next.length > 300 ? next.slice(next.length - 300) : next;
          });
        });

        const unStatus = await listen<AgentStatusPayload>('agent_status', (event) => {
          if (!mounted) return;
          const { agent_id, status } = event.payload;
          const timestamp = new Date().toTimeString().split(' ')[0];

          setAgents(prev => {
            if (status === 'killed' || status === 'error' || status === 'completed') {
              return prev.filter(a => a.id !== agent_id);
            }
            const exists = prev.some(a => a.id === agent_id);
            if (exists) {
              return prev.map(a => a.id === agent_id ? { ...a, status: status === 'running' ? 'running' : 'paused' } : a);
            }
            return [...prev, { id: agent_id, name: 'Headless Web Agent', status: 'running' }];
          });

          setLogs(prev => {
            const entry: TerminalLog = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp,
              agentId: agent_id,
              message: `[STATUS] Agent ${agent_id.slice(0, 7).toUpperCase()} status changed to: ${status.toUpperCase()}`,
              level: status === 'killed' || status === 'error' ? 'error' : status === 'completed' ? 'success' : 'info',
            };
            const next = [...prev, entry];
            return next.length > 300 ? next.slice(next.length - 300) : next;
          });
        });

        if (mounted) {
          unlistenLog = unLog;
          unlistenStatus = unStatus;
        } else {
          unLog();
          unStatus();
        }
      } catch (e) {
        console.warn('Tauri event listeners not initialized:', e);
      }
    }

    registerListeners();

    // Poll for active agents every 2 seconds (guarded by isTauri)
    let interval: NodeJS.Timeout | undefined;
    if (isTauri()) {
      interval = setInterval(async () => {
        const active = await getActiveAgents();
        if (mounted && active) {
          if (active.length === 0) {
            setAgents([]);
          } else {
            setAgents(prev => {
              const map = new Map(active.map(a => [a.id, a]));
              for (const local of prev) {
                if (!map.has(local.id) && local.status === 'running') {
                  map.set(local.id, local);
                }
              }
              return Array.from(map.values());
            });
          }
        }
      }, 2000);
      
      getActiveAgents().then(active => {
        if (mounted && active) {
          setAgents(active);
        }
      });
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (unlistenLog) unlistenLog();
      if (unlistenStatus) unlistenStatus();
    };
  }, []);

  const handleSpawnAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const task = taskPrompt.trim() || 'Scrape Lead Gen (LinkedIn)';
    const agentId = `agent-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    setIsSpawning(true);

    const newAgent: ActiveAgent = {
      id: agentId,
      name: task.length > 28 ? `${task.substring(0, 25)}...` : task,
      status: 'running',
    };
    setAgents(prev => [newAgent, ...prev]);

    const timestamp = new Date().toTimeString().split(' ')[0];
    const logItem: TerminalLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp,
      agentId,
      message: `[SPAWN] Initializing headless agent ${agentId.slice(0, 7).toUpperCase()} for: "${task}"`,
      level: 'info',
    };
    setLogs(prev => [...prev, logItem].slice(-300));

    try {
      await spawnAgent(agentId, task);
    } catch (err) {
      console.error('Failed to spawn agent:', err);
    } finally {
      setIsSpawning(false);
      setIsSpawnModalOpen(false);
    }
  };

  const handleKillAgent = async (agentId: string) => {
    try {
      await killAgent(agentId);
    } catch (err) {
      console.error('Failed to kill agent:', err);
    }
    setAgents(prev => prev.filter(a => a.id !== agentId));
    const timestamp = new Date().toTimeString().split(' ')[0];
    const killLog: TerminalLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp,
      agentId,
      message: `[KILL] Agent ${agentId.slice(0, 7).toUpperCase()} terminated by user.`,
      level: 'error',
    };
    setLogs(prev => [...prev, killLog].slice(-300));
  };

  const handleToggleAgentPause = (agentId: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const nextStatus = a.status === 'running' ? 'paused' : 'running';
        const timestamp = new Date().toTimeString().split(' ')[0];
        const pauseLog: TerminalLog = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp,
          agentId,
          message: `[COMMAND] Agent ${agentId.slice(0, 7).toUpperCase()} ${nextStatus.toUpperCase()}`,
          level: 'warn',
        };
        setLogs(curr => [...curr, pauseLog].slice(-300));
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleCopyLogs = async () => {
    const text = logs
      .map(l => `[${l.timestamp}] ${l.agentId ? `[${l.agentId}] ` : ''}${l.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy logs', e);
    }
  };

  const handleClearLogs = () => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs([
      {
        id: `${Date.now()}`,
        timestamp,
        message: 'Terminal logs cleared by user.',
        level: 'info',
      }
    ]);
  };

  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl"><img src="/icon.svg" alt="logo" className="inline-block w-[1em] h-[1em]" /></span>
          <span><strong>MYLO</strong><small>[orchestrator]</small></span>
        </Link>
        <div className="nav-actions">
          <Link href="/" className="nav-back-link">
            <ArrowLeft size={14} /> Back to Site
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
          MYLO isn't just a foreground pointer anymore. Spawn headless HTTP browser agents that run completely unseen. Scrape, post, and execute workflows while you keep coding in the foreground.
        </p>
      </section>

      {/* Mission Control Panel */}
      <section className="shell pb-16">
        <div className="mode-panel blue shadow-[8px_8px_0_var(--ink)]" style={{ gridTemplateColumns: '350px 1fr', transform: 'rotate(-0.5deg)', padding: '24px', gap: '24px' }}>
          
          {/* Left Column: Agent List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-2 mb-2">
              <h3 className="text-xl font-bold font-['Trebuchet_MS'] m-0">Active Agents</h3>
              <span className="text-xs font-['Courier_New'] font-bold bg-[var(--green)] px-2 py-1 border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)]">
                {agents.length} ACTIVE
              </span>
            </div>

            {agents.length === 0 ? (
              <div className="text-center p-6 text-sm font-['Courier_New'] border-2 border-dashed border-[var(--ink)] bg-white/50 rounded text-[#666]">
                No active background agents.
                <div className="mt-2 text-xs text-[#888]">
                  Click below to launch an autonomous worker.
                </div>
              </div>
            ) : (
              agents.map((agent, i) => (
                <div key={agent.id} className={`bg-white border-2 border-[var(--ink)] rounded-[6px_3px_8px_4px] p-4 shadow-[3px_3px_0_var(--ink)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ink)] transition-all transform ${i % 2 === 0 ? '-rotate-0.5' : 'rotate-0.5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Courier_New'] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Globe size={13} className={i % 2 === 0 ? "text-[var(--blue)]" : "text-[var(--ink)]"} /> 
                      ID: {agent.id.substring(0, 7).toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-['Courier_New'] font-bold uppercase">
                      <span className={`w-2 h-2 rounded-full border border-[var(--ink)] ${agent.status === 'running' ? 'bg-[var(--green)] animate-pulse' : 'bg-[var(--yellow)]'}`}></span>
                      {agent.status}
                    </span>
                  </div>
                  <strong className="block text-sm mb-3 font-['Trebuchet_MS']">{agent.name}</strong>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleToggleAgentPause(agent.id)}
                      className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[4px_6px_3px_5px] py-1 text-xs font-bold font-['Courier_New'] hover:bg-[var(--yellow)] transition-colors flex items-center justify-center gap-1 shadow-[2px_2px_0_var(--ink)] active:translate-y-[1px]"
                    >
                      {agent.status === 'running' ? (
                        <>
                          <Pause size={12} /> PAUSE
                        </>
                      ) : (
                        <>
                          <Play size={12} /> RESUME
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleKillAgent(agent.id)}
                      className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[5px_3px_6px_4px] py-1 text-xs font-bold font-['Courier_New'] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors flex items-center justify-center gap-1 shadow-[2px_2px_0_var(--ink)] active:translate-y-[1px]"
                    >
                      <Square size={12} /> KILL
                    </button>
                  </div>
                </div>
              ))
            )}

            <button 
              onClick={() => setIsSpawnModalOpen(true)}
              className="mt-2 w-full border-2 border-dashed border-[var(--ink)] bg-white/70 hover:bg-[var(--yellow)] rounded-[8px_4px_6px_3px] py-3 text-xs font-bold font-['Courier_New'] text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:border-solid hover:shadow-[4px_4px_0_var(--ink)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu size={14} /> + SPAWN NEW AGENT
            </button>
          </div>

          {/* Right Column: Terminal Logs */}
          <div className="bg-[#1e1e1e] border-2 border-[var(--ink)] rounded-[8px_5px_12px_6px] p-5 flex flex-col transform rotate-[0.5deg] shadow-[6px_6px_0_var(--ink)] overflow-hidden h-[480px]">
            {/* Terminal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <span className="text-[#aaa] font-['Courier_New'] text-xs flex items-center gap-2">
                  <Terminal size={13} className="text-[var(--blue)]" /> HEADLESS_HTTP_AGENT // LIVE_STREAM
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  title="Copy all logs to clipboard"
                  className="bg-[#2c2c2c] hover:bg-[#3d3d3d] text-[#e0e0e0] border border-[#555] rounded px-2.5 py-1 text-[11px] font-['Courier_New'] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy Logs'}</span>
                </button>
                <button
                  onClick={handleClearLogs}
                  title="Clear terminal logs"
                  className="bg-[#2c2c2c] hover:bg-[#ff5f56]/20 text-[#e0e0e0] hover:text-[#ff5f56] border border-[#555] hover:border-[#ff5f56] rounded px-2.5 py-1 text-[11px] font-['Courier_New'] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Clear Logs</span>
                </button>
              </div>
            </div>
            
            {/* Terminal Body */}
            <div 
              ref={terminalBodyRef}
              onScroll={handleTerminalScroll}
              className="flex-1 font-['Courier_New'] text-xs leading-relaxed overflow-y-auto text-[#e0e0e0] flex flex-col gap-1.5 pr-2"
            >
              {logs.map((log) => {
                let colorClass = 'text-[#e0e0e0]';
                if (log.level === 'success') colorClass = 'text-green-400';
                else if (log.level === 'error') colorClass = 'text-red-400 font-bold';
                else if (log.level === 'warn') colorClass = 'text-yellow-400';
                else if (log.level === 'reasoning') colorClass = 'text-blue-400';

                return (
                  <div key={log.id} className="flex items-start gap-2 break-all">
                    <span className="text-[#666] shrink-0 select-none">[{log.timestamp}]</span>
                    {log.agentId && (
                      <span className="text-sky-300 font-bold shrink-0 select-none">
                        [{log.agentId.slice(0, 7).toUpperCase()}]
                      </span>
                    )}
                    <span className={colorClass}>{log.message}</span>
                  </div>
                );
              })}

              {agents.some(a => a.status === 'running') && (
                <div className="text-yellow-400 animate-pulse mt-2 flex items-center gap-2 font-['Courier_New'] text-xs">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span> 
                  Active worker processing network stream...
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Spawn Agent Modal */}
      {isSpawnModalOpen && (
        <div className="platform-modal-backdrop" onClick={() => setIsSpawnModalOpen(false)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsSpawnModalOpen(false)}
              className="modal-close"
              title="Close modal"
            >
              <X size={16} />
            </button>

            <div className="modal-icon">
              <Cpu size={28} className="text-white" />
            </div>

            <h2 className="text-2xl font-bold font-['Trebuchet_MS'] m-0">Spawn New Agent</h2>
            <p className="text-xs font-['Courier_New'] text-[#555] mt-2 mb-4">
              Deploy an isolated headless browser worker. It runs unseen in the background executing autonomous web workflows.
            </p>

            <form onSubmit={handleSpawnAgent} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold font-['Courier_New'] uppercase mb-1.5 text-[var(--ink)]">
                  Agent Task Instructions
                </label>
                <input
                  type="text"
                  value={taskPrompt}
                  onChange={e => setTaskPrompt(e.target.value)}
                  placeholder="e.g. Scrape Lead Gen (LinkedIn)"
                  className="w-full bg-white border-2 border-[var(--ink)] p-3 rounded-[4px_6px_3px_5px] font-['Courier_New'] text-sm shadow-[2px_2px_0_var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                  autoFocus
                />
              </div>

              <div>
                <span className="block text-[10px] font-bold font-['Courier_New'] uppercase text-[#666] mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Scrape Lead Gen (LinkedIn)',
                    'Monitor Competitor Pricing',
                    'Auto-fill QA Test Form',
                    'Check Status of GitHub PRs'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTaskPrompt(preset)}
                      className="text-[10px] font-['Courier_New'] bg-white hover:bg-[var(--yellow)] border border-[var(--ink)] px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-3 pt-3 border-t-2 border-dashed border-[var(--ink)]">
                <button
                  type="button"
                  onClick={() => setIsSpawnModalOpen(false)}
                  className="flex-1 bg-white border-2 border-[var(--ink)] py-2.5 px-4 font-['Courier_New'] text-xs font-bold rounded-[6px_3px_7px_4px] shadow-[2px_2px_0_var(--ink)] hover:bg-[#f0ece1] transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSpawning}
                  className="flex-1 ink-button py-2.5 px-4 text-xs font-bold font-['Courier_New'] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSpawning ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      SPAWNING...
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      DEPLOY AGENT
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

