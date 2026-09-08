import Link from 'next/link'
import { ArrowLeft, Activity, ShieldCheck, Clock, MonitorCheck, Cpu, Zap } from 'lucide-react'

export default function MonitoringSettings() {
  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl"><img src="/icon.svg" alt="logo" className="inline-block w-[1em] h-[1em]" /></span>
          <span><strong>MYLO</strong><small>[settings:telemetry]</small></span>
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
          <div className="status" style={{ backgroundColor: 'var(--green)', color: 'var(--ink)', borderColor: 'var(--ink)' }}>
            <Zap size={14} className="mr-2" /> V2 // ZERO-COST MONITORING
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 54px)', maxWidth: '800px', lineHeight: 1 }}>
          Event-Driven <em>Telemetry</em>.
        </h1>
        <p className="lede">
          MYLO doesn't use heavy local AI models that melt your laptop. We use native OS hooks (0% CPU) to detect when you're stuck, taking a single frame only when needed.
        </p>
      </section>

      {/* Settings Panel */}
      <section className="shell pb-16">
        <div className="mode-panel shadow-[8px_8px_0_var(--ink)] bg-[#fffdf9]" style={{ gridTemplateColumns: '1fr', transform: 'rotate(0.5deg)', padding: '32px', gap: '32px' }}>
          
          {/* Top Info Banner */}
          <div className="bg-[var(--yellow)] border-2 border-[var(--ink)] p-4 rounded-[5px_8px_4px_6px] flex items-start gap-4 transform -rotate-1 shadow-[4px_4px_0_var(--ink)]">
            <div className="bg-[var(--ink)] text-white p-2 rounded-full mt-1">
              <Cpu size={16} />
            </div>
            <div>
              <strong className="block text-lg mb-1">0% CPU Overhead Guaranteed</strong>
              <p className="text-sm m-0 font-['Courier_New'] opacity-90 leading-relaxed">
                We replaced constant local ML inference with native C++/Rust OS event hooks. MYLO simply listens for mouse/keyboard idle states in specific apps. 
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            
            {/* Toggles & Triggers */}
            <div className="flex flex-col gap-6">
              <div className="bg-white border-2 border-[var(--ink)] p-5 rounded-[8px_4px_6px_5px] shadow-[3px_3px_0_var(--ink)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MonitorCheck size={18} className="text-[var(--blue)]" />
                    <strong className="text-lg">Proactive Help</strong>
                  </div>
                  {/* Fake Toggle */}
                  <div className="w-12 h-6 bg-[var(--green)] rounded-full border-2 border-[var(--ink)] relative cursor-pointer shadow-[2px_2px_0_var(--ink)]">
                    <div className="w-4 h-4 bg-white border-2 border-[var(--ink)] rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <p className="text-sm text-[#555] font-['Courier_New'] mb-4">
                  If you are idle in a target application, MYLO will ping the cloud AI (Haiku) to see if you need help.
                </p>
                
                <div className="flex flex-col gap-3 font-['Courier_New'] text-sm">
                  <label className="flex flex-col gap-1 font-bold">
                    Target Applications (Comma separated)
                    <input type="text" defaultValue="VSCode, Cursor, Xcode, Terminal" className="border-2 border-[var(--ink)] rounded p-2 focus:outline-none focus:border-[var(--blue)] bg-[#f7f5ef]" />
                  </label>
                  
                  <label className="flex flex-col gap-1 font-bold">
                    Idle Time Trigger (Minutes)
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#666]" />
                      <input type="number" defaultValue={3} min={1} max={15} className="border-2 border-[var(--ink)] rounded p-2 w-20 focus:outline-none focus:border-[var(--blue)] bg-[#f7f5ef]" />
                      <span className="text-[#666]">minutes</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="flex flex-col gap-6">
              <div className="bg-white border-2 border-[var(--ink)] p-5 rounded-[4px_8px_5px_6px] shadow-[3px_3px_0_var(--ink)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={18} className="text-[var(--red)]" />
                  <strong className="text-lg">Privacy First</strong>
                </div>
                <p className="text-sm text-[#555] font-['Courier_New'] mb-6 leading-relaxed">
                  Screen-aware AI usually means a privacy nightmare. MYLO fixes this by dropping the "always-recording" approach.
                </p>
                
                <ul className="flex flex-col gap-4 font-['Courier_New'] text-xs text-[var(--ink)] p-0 m-0 list-none">
                  <li className="flex items-start gap-3 bg-[#f7f5ef] p-3 border border-dashed border-[var(--ink)] rounded">
                    <span className="w-4 h-4 rounded-full bg-[var(--green)] border border-[var(--ink)] flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong>No Video Streaming</strong><br/>
                      MYLO never records video. It only captures 1 single frame when the idle trigger is hit.
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-[#f7f5ef] p-3 border border-dashed border-[var(--ink)] rounded">
                    <span className="w-4 h-4 rounded-full bg-[var(--green)] border border-[var(--ink)] flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong>No Disk Storage</strong><br/>
                      The frame is held in RAM (Rust buffer), encoded to base64, sent to the API, and immediately dropped.
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-[#f7f5ef] p-3 border border-dashed border-[var(--ink)] rounded">
                    <span className="w-4 h-4 rounded-full bg-[var(--green)] border border-[var(--ink)] flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong>Targeted Context Only</strong><br/>
                      MYLO will ignore your screen completely if the active window is Chrome, Spotify, or Messages.
                    </div>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          <div className="mt-4 flex justify-end">
             <button className="ink-button text-sm px-6 py-3">
               Save Telemetry Settings
             </button>
          </div>
        </div>
      </section>
    </main>
  )
}
