import Link from 'next/link'
import { ArrowLeft, Cpu, FastForward, BrainCircuit, MousePointer2, Keyboard, CheckCircle2, Zap, Activity } from 'lucide-react'

export default function Dashboard() {
  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl">✳</span>
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
        <div className="status-wrap mb-4">
          <div className="status" style={{ backgroundColor: 'var(--red)', color: 'white', borderColor: 'var(--ink)' }}>
            <Zap size={14} className="mr-2" /> V2 // GHOST IN THE MACHINE
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
          
          {/* Left Column: Dynamic Routing & Telemetry (Step 3) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
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
          </div>

          {/* Right Column: Ghost in the Machine Action Queue (Step 4) */}
          <div className="lg:col-span-8">
             <div className="mode-panel shadow-[8px_8px_0_var(--ink)] bg-[#fffdf9] h-full" style={{ gridTemplateColumns: '1fr', padding: '32px' }}>
                <div className="flex justify-between items-center mb-6 border-b-2 border-[var(--ink)] pb-3">
                  <h3 className="text-2xl font-bold m-0 flex items-center gap-2">
                    <Activity size={24} className="text-[var(--red)] animate-pulse" />
                    Live Action Queue
                  </h3>
                  <span className="ink-button text-xs py-1.5 px-3">INTERRUPT SEQUENCE (ESC)</span>
                </div>

                <div className="flex flex-col gap-4 relative">
                  {/* Connection Line */}
                  <div className="absolute left-[19px] top-4 bottom-8 w-0.5 bg-[var(--ink)] z-0 dashed-line"></div>

                  {/* Completed Action */}
                  <div className="relative z-10 flex gap-4 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-[var(--ink)] flex items-center justify-center text-[var(--green)] shrink-0 shadow-[2px_2px_0_var(--ink)]">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="pt-2">
                      <strong className="block text-sm">Screen Analyzed</strong>
                      <span className="text-xs font-['Courier_New']">Found target: <code>&lt;button id="deploy"&gt;</code></span>
                    </div>
                  </div>

                  {/* In Progress Action */}
                  <div className="relative z-10 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--yellow)] border-2 border-[var(--ink)] flex items-center justify-center text-[var(--ink)] shrink-0 shadow-[2px_2px_0_var(--ink)] animate-bounce">
                      <MousePointer2 size={18} />
                    </div>
                    <div className="bg-white border-2 border-[var(--ink)] p-4 rounded-[6px_8px_4px_5px] shadow-[4px_4px_0_var(--blue)] flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <strong className="block text-base">Moving Cursor</strong>
                        <span className="text-[10px] font-['Courier_New'] bg-[var(--ink)] text-white px-2 py-0.5 rounded">RUST_ENIGO</span>
                      </div>
                      <p className="text-xs font-['Courier_New'] m-0 mb-3 text-[#444]">
                        Injecting bezier-curved physical mouse movement to [x: 1420, y: 840].
                      </p>
                      <div className="w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden border border-[#ccc]">
                        <div className="w-[65%] bg-[var(--blue)] h-full transition-all duration-300"></div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Action */}
                  <div className="relative z-10 flex gap-4 opacity-50 mt-2">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-[var(--ink)] flex items-center justify-center text-[#888] shrink-0 border-dashed">
                      <MousePointer2 size={18} />
                    </div>
                    <div className="pt-2">
                      <strong className="block text-sm text-[#666]">Left Click</strong>
                      <span className="text-xs font-['Courier_New'] text-[#888]">Pending physical click execution...</span>
                    </div>
                  </div>

                  {/* Pending Action */}
                  <div className="relative z-10 flex gap-4 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-[var(--ink)] flex items-center justify-center text-[#888] shrink-0 border-dashed">
                      <Keyboard size={18} />
                    </div>
                    <div className="pt-2">
                      <strong className="block text-sm text-[#666]">Keyboard Injection</strong>
                      <span className="text-xs font-['Courier_New'] text-[#888]">Pending: <code>git commit -m "fix UI"</code></span>
                    </div>
                  </div>

                </div>
             </div>
          </div>

        </div>
      </section>
    </main>
  )
}
