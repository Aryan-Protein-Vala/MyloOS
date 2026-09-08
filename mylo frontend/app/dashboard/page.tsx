'use client';
import Link from 'next/link'
import { ArrowLeft, Cpu, FastForward, BrainCircuit, MousePointer2, Keyboard, CheckCircle2, Zap, Activity, MessageSquare, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react';
import { getChatHistory, ChatMessage, checkForAppUpdates, installAppUpdate } from '../../lib/tauri-ipc';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'installing' | 'installed' | 'error';

export default function Dashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [versionInfo, setVersionInfo] = useState<{ current: string; newVersion?: string; message?: string }>({
    current: 'v0.1.0',
  });

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const res = await checkForAppUpdates();
      if (res.available && res.version) {
        setVersionInfo({
          current: res.currentVersion.startsWith('v') ? res.currentVersion : `v${res.currentVersion}`,
          newVersion: res.version.startsWith('v') ? res.version : `v${res.version}`,
        });
        setUpdateStatus('available');
      } else {
        setVersionInfo({
          current: res.currentVersion.startsWith('v') ? res.currentVersion : `v${res.currentVersion}`,
        });
        setUpdateStatus('idle');
      }
    } catch (err: unknown) {
      setUpdateStatus('error');
      setVersionInfo(prev => ({ ...prev, message: 'Update check failed.' }));
    }
  };

  const handleInstallUpdate = async () => {
    setUpdateStatus('installing');
    try {
      const success = await installAppUpdate();
      if (success) {
        setUpdateStatus('installed');
      } else {
        setUpdateStatus('available');
      }
    } catch {
      setUpdateStatus('available');
    }
  };

  useEffect(() => {
    // Poll chat history
    const interval = setInterval(async () => {
      const history = await getChatHistory(10);
      setMessages(history);
    }, 2000);
    
    getChatHistory(10).then(setMessages);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl"><img src="/icon.svg" alt="logo" className="inline-block w-[1em] h-[1em]" /></span>
          <span><strong>MYLO</strong><small>[ghost:dashboard]</small></span>
        </Link>
        <div className="nav-actions">
          <Link href="/" className="nav-back-link">
            <ArrowLeft size={14} /> Back to Site
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="shell pt-12 pb-8">
        <div className="status-wrap mb-4 flex flex-wrap items-center gap-3">
          <div className="status" style={{ backgroundColor: 'var(--red)', color: 'white', borderColor: 'var(--ink)' }}>
            <Zap size={14} className="mr-2" /> V2 // GHOST IN THE MACHINE
          </div>
          <div className="status flex items-center gap-2" style={{ backgroundColor: updateStatus === 'available' ? 'var(--yellow)' : 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--ink)' }}>
            <span className={`w-2 h-2 rounded-full border border-[var(--ink)] ${
              updateStatus === 'checking' ? 'bg-yellow-400 animate-ping' : 
              updateStatus === 'available' ? 'bg-[var(--red)] animate-pulse' : 
              'bg-[var(--green)]'
            }`}></span>
            <span>
              {updateStatus === 'checking' && 'MYLO // CHECKING UPDATES...'}
              {updateStatus === 'available' && `MYLO // UPDATE AVAILABLE (${versionInfo.newVersion})`}
              {updateStatus === 'installing' && 'MYLO // INSTALLING UPDATE...'}
              {updateStatus === 'installed' && 'MYLO // UPDATE INSTALLED'}
              {(updateStatus === 'idle' || updateStatus === 'error') && `MYLO OS // ${versionInfo.current} • UP TO DATE`}
            </span>
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 54px)', maxWidth: '800px', lineHeight: 1 }}>
          Execution <em>Dashboard</em>.
        </h1>
        <p className="lede">
          Watch MYLO think and act in real-time. This dashboard visualizes the Dynamic Model Router (swapping models to save margins) and the physical OS-level action queue.
        </p>
      </section>

      {/* Dashboard Grid */}
      <section className="shell pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Dynamic Routing, Telemetry & System Updates */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* System & Updates Card */}
            <div className="bg-white border-2 border-[var(--ink)] p-5 rounded-[6px_8px_5px_7px] shadow-[4px_4px_0_var(--ink)] transform -rotate-0.5 transition-transform hover:-rotate-1">
              <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[var(--yellow)] border-2 border-[var(--ink)] flex items-center justify-center text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-['Trebuchet_MS'] m-0 leading-tight">System & Updates</h3>
                    <span className="text-[10px] font-['Courier_New'] text-[#666]">MYLO CORE CLIENT</span>
                  </div>
                </div>
                <span className="font-['Courier_New'] text-xs font-bold px-2 py-0.5 bg-[var(--paper)] border border-[var(--ink)] rounded shadow-[1px_1px_0_var(--ink)]">
                  {versionInfo.current}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {/* Status Row */}
                <div className="flex items-center justify-between p-2.5 bg-[var(--paper)] border border-[var(--ink)] rounded-[4px_6px_3px_5px]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border border-[var(--ink)] ${
                      updateStatus === 'checking' ? 'bg-yellow-400 animate-ping' :
                      updateStatus === 'available' ? 'bg-[var(--red)] animate-pulse' :
                      updateStatus === 'installing' ? 'bg-[var(--blue)] animate-bounce' :
                      'bg-[var(--green)]'
                    }`}></span>
                    <span className="text-xs font-bold font-['Courier_New'] text-[var(--ink)]">
                      {updateStatus === 'idle' && 'Up to date'}
                      {updateStatus === 'checking' && 'Checking for updates...'}
                      {updateStatus === 'available' && `Update available: ${versionInfo.newVersion}`}
                      {updateStatus === 'installing' && 'Downloading & installing...'}
                      {updateStatus === 'installed' && 'Installed! Restart to apply.'}
                      {updateStatus === 'error' && (versionInfo.message || 'Up to date')}
                    </span>
                  </div>
                  <span className="text-[10px] font-['Courier_New'] text-[#777]">
                    {updateStatus === 'checking' ? 'POLLING' : 'V2 CHANNEL'}
                  </span>
                </div>

                {/* Dynamic Action Button */}
                {updateStatus === 'available' ? (
                  <button
                    onClick={handleInstallUpdate}
                    className="w-full bg-[var(--green)] text-[var(--ink)] border-2 border-[var(--ink)] py-2 px-3 rounded-[5px_7px_4px_6px] font-['Courier_New'] text-xs font-bold shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--ink)] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Update available: {versionInfo.newVersion} - Install now
                  </button>
                ) : (
                  <button
                    onClick={handleCheckUpdates}
                    disabled={updateStatus === 'checking' || updateStatus === 'installing'}
                    className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] py-2 px-3 rounded-[5px_7px_4px_6px] font-['Courier_New'] text-xs font-bold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] hover:bg-[var(--yellow)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={13} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                    {updateStatus === 'checking' ? 'Checking for updates...' : 'Check for Updates'}
                  </button>
                )}

                <div className="flex justify-between items-center text-[10px] font-['Courier_New'] text-[#666] pt-1">
                  <span>Auto-check: Active</span>
                  <span>Tauri v2 Native</span>
                </div>
              </div>
            </div>

            
            {/* Active Model Indicator */}
            <div className="bg-white border-2 border-[var(--ink)] p-5 rounded-[5px_8px_4px_6px] shadow-[4px_4px_0_var(--ink)] transform -rotate-1">
              <h3 className="text-lg font-bold font-['Trebuchet_MS'] m-0 mb-4 border-b-2 border-[var(--ink)] pb-2">Dynamic Router</h3>
              
              <div className="flex flex-col gap-4">
                {/* Haiku Route */}
                <div className="flex items-center gap-3 p-3 bg-[var(--yellow)] border-2 border-[var(--ink)] rounded opacity-100 shadow-[2px_2px_0_var(--ink)]">
                  <div className="bg-white p-1.5 border border-[var(--ink)] rounded">
                    <FastForward size={18} className="text-[var(--ink)]" />
                  </div>
                  <div>
                    <strong className="block text-sm">Claude 3 Haiku</strong>
                    <span className="text-xs font-['Courier_New']">Status: <span className="text-green-600 font-bold">ACTIVE (Navigation)</span></span>
                  </div>
                </div>

                {/* Sonnet Route */}
                <div className="flex items-center gap-3 p-3 bg-[#f7f5ef] border-2 border-dashed border-[var(--ink)] rounded opacity-60">
                  <div className="bg-white p-1.5 border border-[var(--ink)] rounded">
                    <BrainCircuit size={18} className="text-[var(--ink)]" />
                  </div>
                  <div>
                    <strong className="block text-sm">Claude 3.5 Sonnet</strong>
                    <span className="text-xs font-['Courier_New']">Status: STANDBY (Deep Coding)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs font-['Courier_New'] mt-4 text-[#555] leading-relaxed">
                MYLO is currently using the cheap, fast model to locate the "Submit" button on screen. If a complex logic error is detected, it will seamlessly route to Sonnet.
              </p>
            </div>

            {/* Token Burn Rate */}
            <div className="bg-[var(--ink)] text-white border-2 border-[var(--ink)] p-5 rounded-[8px_4px_6px_5px] shadow-[4px_4px_0_var(--blue)] transform rotate-1">
               <h3 className="text-lg font-bold font-['Trebuchet_MS'] m-0 mb-4 border-b border-[#444] pb-2 text-[var(--paper)]">Token Burn Rate</h3>
               
               <div className="flex justify-between items-end mb-2">
                 <span className="font-['Courier_New'] text-sm text-[#aaa]">Session Cost</span>
                 <span className="font-['Courier_New'] font-bold text-lg text-[var(--green)]">$0.0042</span>
               </div>
               
               <div className="w-full h-3 bg-[#333] rounded-full overflow-hidden border border-[#555]">
                 <div className="h-full bg-[var(--green)] w-[12%]"></div>
               </div>
               <div className="flex justify-between mt-2 text-[10px] font-['Courier_New'] text-[#888]">
                 <span>Margin Safe</span>
                 <span>Profit Danger</span>
               </div>
            </div>
          </div>           {/* Right Column: Ghost in the Machine Action Queue (Step 4) */}
          <div className="lg:col-span-8">
             <div className="mode-panel shadow-[8px_8px_0_var(--ink)] bg-[#fffdf9] h-full" style={{ gridTemplateColumns: '1fr', padding: '32px' }}>
                <div className="flex justify-between items-center mb-6 border-b-2 border-[var(--ink)] pb-3">
                  <h3 className="text-2xl font-bold m-0 flex items-center gap-2">
                    <Activity size={24} className="text-[var(--red)] animate-pulse" />
                    Live AI Memory (SQLite)
                  </h3>
                  <span className="ink-button text-xs py-1.5 px-3">INTERRUPT SEQUENCE (ESC)</span>
                </div>

                <div className="flex flex-col gap-4 relative">
                  {/* Connection Line */}
                  <div className="absolute left-[19px] top-4 bottom-8 w-0.5 bg-[var(--ink)] z-0 dashed-line"></div>

                  {messages.length === 0 ? (
                    <div className="relative z-10 flex gap-4 opacity-60">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-[var(--ink)] flex items-center justify-center text-[var(--ink)] shrink-0 shadow-[2px_2px_0_var(--ink)]">
                        <MessageSquare size={18} />
                      </div>
                      <div className="pt-2">
                        <strong className="block text-sm">No Memory</strong>
                        <span className="text-xs font-['Courier_New']">Session history is completely blank...</span>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={msg.id} className={`relative z-10 flex gap-4 ${i > 2 ? 'opacity-60' : ''}`}>
                        <div className={`w-10 h-10 rounded-full border-2 border-[var(--ink)] flex items-center justify-center shrink-0 shadow-[2px_2px_0_var(--ink)] ${msg.role === 'user' ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-[var(--ink)] text-white'}`}>
                          {msg.role === 'user' ? <Keyboard size={18} /> : <BrainCircuit size={18} />}
                        </div>
                        <div className="bg-white border-2 border-[var(--ink)] p-4 rounded-[6px_8px_4px_5px] shadow-[4px_4px_0_var(--blue)] flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <strong className="block text-base capitalize">{msg.role}</strong>
                            <span className="text-[10px] font-['Courier_New'] bg-[var(--ink)] text-white px-2 py-0.5 rounded">{msg.timestamp}</span>
                          </div>
                          <p className="text-xs font-['Courier_New'] m-0 text-[#444] whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                </div>
             </div>
          </div>

        </div>
      </section>
    </main>
  )
}
