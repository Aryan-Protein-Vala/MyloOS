import Link from 'next/link'
import { ArrowLeft, Activity, Play, Pause, Square, Terminal, Globe, Cpu } from 'lucide-react'

export default function Orchestrator() {
  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl">✳</span>
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
              <span className="text-xs font-['Courier_New'] font-bold bg-[var(--green)] px-2 py-1 border border-[var(--ink)]">2 RUNNING</span>
            </div>

            {/* Agent 1 */}
            <div className="bg-white border-2 border-[var(--ink)] rounded-[6px_3px_8px_4px] p-4 shadow-[3px_3px_0_var(--ink)] hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--ink)] transition-all cursor-pointer transform -rotate-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-['Courier_New'] text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                  <Globe size={12} className="text-[var(--blue)]" /> ID: 894F-2A
                </span>
                <span className="w-2 h-2 bg-[var(--green)] rounded-full animate-pulse border border-[var(--ink)]"></span>
              </div>
              <strong className="block text-sm mb-2">Scrape Lead Gen (LinkedIn)</strong>
              <div className="flex gap-2">
                <button className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[4px_6px_3px_5px] py-1 text-xs font-bold font-['Courier_New'] hover:bg-[var(--yellow)] transition-colors flex items-center justify-center gap-1">
                  <Pause size={12} /> PAUSE
                </button>
                <button className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[5px_3px_6px_4px] py-1 text-xs font-bold font-['Courier_New'] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors flex items-center justify-center gap-1">
                  <Square size={12} /> KILL
                </button>
              </div>
            </div>

            {/* Agent 2 */}
            <div className="bg-white border-2 border-[var(--ink)] rounded-[4px_8px_3px_6px] p-4 shadow-[3px_3px_0_var(--ink)] hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--ink)] transition-all cursor-pointer transform rotate-1 opacity-70">
              <div className="flex items-center justify-between mb-2">
                <span className="font-['Courier_New'] text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                  <Globe size={12} className="text-[var(--ink)]" /> ID: 112B-9C
                </span>
                <span className="w-2 h-2 bg-[var(--yellow)] rounded-full border border-[var(--ink)]"></span>
              </div>
              <strong className="block text-sm mb-2">Draft Marketing Emails (Gmail)</strong>
              <div className="flex gap-2">
                <button className="flex-1 bg-[var(--ink)] text-white border-2 border-[var(--ink)] rounded-[4px_6px_3px_5px] py-1 text-xs font-bold font-['Courier_New'] hover:bg-[var(--blue)] transition-colors flex items-center justify-center gap-1">
                  <Play size={12} /> RESUME
                </button>
                <button className="flex-1 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[5px_3px_6px_4px] py-1 text-xs font-bold font-['Courier_New'] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors flex items-center justify-center gap-1">
                  <Square size={12} /> KILL
                </button>
              </div>
            </div>

            <button className="mt-2 w-full border-2 border-dashed border-[var(--ink)] rounded-[8px_4px_6px_3px] py-3 text-xs font-bold font-['Courier_New'] text-[var(--ink)] hover:bg-[var(--yellow)] hover:border-solid transition-all flex items-center justify-center gap-2">
              <Cpu size={14} /> + SPAWN NEW AGENT
            </button>
          </div>

          {/* Right Column: Terminal Logs */}
          <div className="bg-[#1e1e1e] border-2 border-[var(--ink)] rounded-[8px_5px_12px_6px] p-5 flex flex-col transform rotate-[0.5deg] shadow-[5px_5px_0_var(--ink)] overflow-hidden h-[450px]">
            <div className="flex items-center gap-4 mb-4 border-b border-[#333] pb-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
              </div>
              <span className="text-[#888] font-['Courier_New'] text-xs flex items-center gap-2">
                <Terminal size={12} /> HEADLESS_HTTP_AGENT // 894F-2A
              </span>
            </div>
            
            <div className="flex-1 font-['Courier_New'] text-xs leading-relaxed overflow-y-auto text-[#e0e0e0] flex flex-col gap-2">
              <div className="text-[#888]">[10:42:01] Initialization sequence started...</div>
              <div className="text-[#888]">[10:42:02] Spawning headless Chromium instance (Puppeteer)</div>
              <div className="text-green-400">[10:42:03] SUCCESS: Browser spawned (PID: 8492)</div>
              <div>[10:42:03] Navigating to https://linkedin.com/search/results/people/</div>
              <div className="text-[#888]">[10:42:05] Injecting session cookies...</div>
              <div>[10:42:06] Applying filters: "Founder", "San Francisco", "AI"</div>
              <div>[10:42:08] Scanning page 1/50...</div>
              <div className="text-blue-400">[10:42:10] AGENT REASONING: Found 10 profiles. Extracting data via DOM tree traversal.</div>
              <div className="text-green-400">[10:42:12] Extracted: Sarah Jenkins (CEO @ TechFlow)</div>
              <div className="text-green-400">[10:42:12] Extracted: Mark Zhang (Founder @ DataMesh)</div>
              <div className="text-green-400">[10:42:12] Extracted: Elara Vance (Co-Founder @ NeuralNet)</div>
              <div>[10:42:14] Clicking "Next Page"...</div>
              <div className="text-yellow-400 animate-pulse mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span> 
                Waiting for network idle (500ms)...
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  )
}
