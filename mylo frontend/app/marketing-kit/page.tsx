import Link from 'next/link'
import { ArrowLeft, Target, Cpu, Zap, Crosshair, TrendingUp, MonitorPlay, Users } from 'lucide-react'

export default function MarketingKit() {
  return (
    <main className="pb-32 bg-[var(--paper)]">
      {/* Navigation */}
      <nav className="nav shell" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Link href="/" className="brand">
          <span className="brand-mark text-2xl">✳</span>
          <span><strong>MYLO</strong><small>[marketing dossier]</small></span>
        </Link>
        <div className="nav-actions">
          <Link href="/" className="nav-back-link">
            <ArrowLeft size={14} /> Back to Site
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero shell pt-12 pb-16 print:pt-4 print:pb-8" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }}>
        <div className="status-wrap mx-auto mb-6">
          <div className="status" style={{ backgroundColor: 'var(--yellow)' }}>TOP SECRET // FOR MARKETERS ONLY</div>
        </div>
        <h1 className="mx-auto text-center" style={{ maxWidth: '800px', fontSize: 'clamp(38px,5vw,64px)' }}>
          The Jarvis Blueprint.
          <br />
          <span className="text-[var(--blue)] block mt-4 font-normal tracking-tight text-[0.6em]">
            Everything you need to sell the closest thing to Iron Man&apos;s suit.
          </span>
        </h1>
      </section>

      {/* 1. What is MYLO */}
      <section className="section shell py-12 print:py-6">
        <div className="mode-panel blue shadow-[8px_8px_0_var(--ink)]" style={{ gridTemplateColumns: '1fr', transform: 'rotate(-0.5deg)' }}>
          <div className="mode-text">
            <span className="eyebrow"><Target size={14} className="inline mr-2"/> 01. THE WHAT</span>
            <h3 className="mb-4">What is MYLO?</h3>
            <p className="text-lg">
              MYLO isn&apos;t a chatbot. It&apos;s not a generic copilot that sits in a sidebar and gives you code snippets to copy-paste. 
              <strong> MYLO is the OS for AI Agents.</strong> It is the intern who takes the chalk and solves the equation for you.
            </p>
            <p className="mt-4">
              It&apos;s an OS-native agent that lives on your computer. You hold a hotkey, speak a command, and watch as a ghost cursor physically takes over your screen to click, type, and execute complex workflows.
            </p>
            <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="bg-white p-4 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] block transform hover:-translate-y-1 transition-transform">
                <strong className="block mb-1 text-[var(--red)]">Ghost in the Machine</strong>
                <span className="text-sm text-gray-700">Literally takes over the GUI to physically execute tasks.</span>
              </li>
              <li className="bg-white p-4 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] block transform hover:-translate-y-1 transition-transform">
                <strong className="block mb-1 text-[var(--blue)]">Memory Mesh</strong>
                <span className="text-sm text-gray-700">Remembers your chaotic project structures and personal quirks.</span>
              </li>
              <li className="bg-white p-4 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] block transform hover:-translate-y-1 transition-transform">
                <strong className="block mb-1 text-purple-600">Stealth Mode</strong>
                <span className="text-sm text-gray-700">Completely invisible to screen recording (OBS, Zoom, Slack).</span>
              </li>
              <li className="bg-white p-4 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] block transform hover:-translate-y-1 transition-transform">
                <strong className="block mb-1 text-green-600">Background Orchestrator</strong>
                <span className="text-sm text-gray-700">Does your boring grunt work silently while you sleep.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Why is MYLO */}
      <section className="section shell py-12 print:py-6">
        <div className="mode-panel green shadow-[8px_8px_0_var(--ink)]" style={{ gridTemplateColumns: '1fr', transform: 'rotate(0.5deg)' }}>
          <div className="mode-text">
            <span className="eyebrow"><Crosshair size={14} className="inline mr-2"/> 02. THE WHY</span>
            <h3 className="mb-4">Why does MYLO exist?</h3>
            <p className="text-lg">
              Because typing intents is slow. Because copy-pasting from ChatGPT is exhausting. Because every other &quot;AI desktop app&quot; eats your RAM and ruins your framerate.
            </p>
            <p className="mt-4">
              We exist to bridge the gap between <em>&quot;knowing what to do&quot;</em> and <em>&quot;actually doing it&quot;</em>. Competitors like Clicky are teachers who point at the chalkboard. MYLO is the doer. You tell it to order your usual on UberEats, it spins up a headless browser, logs in, and places the order. 
            </p>
            <div className="mt-8 p-6 bg-white border-2 border-[var(--ink)] rounded shadow-[6px_6px_0_var(--ink)]">
              <h4 className="font-bold text-xl mb-4 text-[var(--red)] underline decoration-wavy decoration-2 underline-offset-4">The Problem with Current AI</h4>
              <p className="mb-3"><strong>Chatbots:</strong> You do all the execution. Exhausting.</p>
              <p className="mb-3"><strong>Copilots:</strong> Trapped in specific apps (IDE, Word). Limited.</p>
              <p className="mb-3"><strong>Cloud Agents:</strong> Can&apos;t see your local files or screen context. Blind.</p>
              <p className="mt-5 text-[var(--blue)] font-bold p-3 bg-[var(--yellow)]/30 border border-dashed border-[var(--ink)] inline-block">
                MYLO fixes all of this. It&apos;s local, sees everything, and executes globally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How is MYLO */}
      <section className="section shell py-12 print:py-6 break-before-page">
        <div className="mode-panel shadow-[8px_8px_0_var(--ink)]" style={{ backgroundColor: 'var(--yellow)', gridTemplateColumns: '1fr', transform: 'rotate(-0.5deg)' }}>
          <div className="mode-text">
            <span className="eyebrow"><Cpu size={14} className="inline mr-2"/> 03. THE HOW</span>
            <h3 className="mb-4">How does it work? (The Magic)</h3>
            <p className="text-lg mb-6">
              We wrote it in Rust so it&apos;s as light as air (~35MB RAM). It uses Apple&apos;s Neural Engine and DirectX for local-first triggers—monitoring your screen for $0 cost.
            </p>
            <div className="grid gap-4">
              <div className="bg-white p-5 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--blue)] text-white flex items-center justify-center border-2 border-[var(--ink)] flex-shrink-0 font-bold text-lg shadow-[2px_2px_0_var(--ink)]">1</div>
                <div>
                  <strong className="block text-lg mb-1">Local-First Vision</strong>
                  <p className="text-gray-700 m-0 leading-relaxed">Constantly monitors the screen using quantized local models without burning a single cent in API credits.</p>
                </div>
              </div>
              <div className="bg-white p-5 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--red)] text-white flex items-center justify-center border-2 border-[var(--ink)] flex-shrink-0 font-bold text-lg shadow-[2px_2px_0_var(--ink)]">2</div>
                <div>
                  <strong className="block text-lg mb-1">Cloud Triggering</strong>
                  <p className="text-gray-700 m-0 leading-relaxed">Only calls the heavy LLM (Claude 3.5 Sonnet / GPT-4o) when an intent is detected or the hotkey is pressed.</p>
                </div>
              </div>
              <div className="bg-white p-5 border-2 border-[var(--ink)] rounded-lg shadow-[4px_4px_0_var(--ink)] flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-[var(--ink)] flex-shrink-0 font-bold text-lg shadow-[2px_2px_0_var(--ink)]">3</div>
                <div>
                  <strong className="block text-lg mb-1">OS-Level GUI Takeover</strong>
                  <p className="text-gray-700 m-0 leading-relaxed">Injects inputs directly at the OS level. It moves the mouse and types on the keyboard exactly like a human.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Marketing Stuff */}
      <section className="section shell py-12 print:py-6">
        <div className="border-2 border-[var(--ink)] bg-white rounded-[6px_14px_4px_10px] shadow-[8px_8px_0_var(--ink)] p-8 md:p-12 relative overflow-hidden" style={{ transform: 'rotate(0.5deg)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
            <TrendingUp size={300} />
          </div>
          
          <div className="relative z-10">
            <span className="eyebrow"><Zap size={14} className="inline mr-2"/> 04. THE MARKETING STRATEGY</span>
            <h3 className="mb-8 text-4xl font-bold tracking-tight mt-2">How we sell this beast.</h3>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="p-6 bg-[var(--paper)] border-2 border-[var(--ink)] rounded shadow-[4px_4px_0_var(--ink)]">
                <h4 className="font-bold text-xl mb-3 text-[var(--red)] pb-2 inline-block">The Narrative</h4>
                <p className="mb-4 text-lg">
                  <em>&quot;Clicky is a toy. Rabbit R1 is a gimmick. MYLO is an employee.&quot;</em>
                </p>
                <div className="p-4 bg-white border-2 border-dashed border-[var(--ink)] font-mono text-sm rounded mb-4 shadow-sm">
                  <strong>Hook:</strong> &quot;Stop chatting with AI. Start commanding it.&quot;
                </div>
                <p className="text-sm text-[#555] font-mono leading-relaxed">
                  Do not attack competitors directly. Position MYLO as the evolution. &quot;Companions point at the screen. Agents click the buttons.&quot;
                </p>
              </div>

              <div className="p-6 bg-[var(--paper)] border-2 border-[var(--ink)] rounded shadow-[4px_4px_0_var(--ink)]">
                <h4 className="font-bold text-xl mb-4 text-[var(--blue)] pb-2 inline-block">The Flex (Launch Video)</h4>
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <MonitorPlay size={22} className="mt-0.5 text-[var(--ink)] flex-shrink-0" />
                    <span className="text-sm leading-relaxed"><strong>Show, Don&apos;t Tell:</strong> Say out loud <em>&quot;MYLO, build a boilerplate app.&quot;</em> Camera shows MYLO physically opening the IDE and typing faster than a human.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users size={22} className="mt-0.5 text-[var(--ink)] flex-shrink-0" />
                    <span className="text-sm leading-relaxed"><strong>The Trojan Horse:</strong> Open-source the base shell, but keep the Memory Mesh closed. Developers build plugins, but pay for memory.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-2xl mb-6 flex items-center gap-2"><Target size={24} className="text-[var(--red)]"/> Unit Economics (Brutally Honest)</h4>
              <div className="overflow-x-auto border-2 border-[var(--ink)] rounded shadow-[4px_4px_0_var(--ink)] bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--ink)]">
                      <th className="py-4 px-5 font-mono text-xs uppercase bg-[var(--yellow)]">Tier</th>
                      <th className="py-4 px-5 font-mono text-xs uppercase bg-[var(--yellow)]">Price</th>
                      <th className="py-4 px-5 font-mono text-xs uppercase bg-[var(--yellow)]">Target Audience</th>
                      <th className="py-4 px-5 font-mono text-xs uppercase bg-[var(--yellow)]">Expected MoM (1k users)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dashed border-[var(--ink)] hover:bg-[var(--paper)] transition-colors">
                      <td className="py-4 px-5 font-bold">Free</td>
                      <td className="py-4 px-5">$0</td>
                      <td className="py-4 px-5">Students (BYOK)</td>
                      <td className="py-4 px-5 font-mono text-gray-500">$0</td>
                    </tr>
                    <tr className="border-b border-dashed border-[var(--ink)] hover:bg-[var(--paper)] transition-colors">
                      <td className="py-4 px-5 font-bold">Pro</td>
                      <td className="py-4 px-5">$29/mo</td>
                      <td className="py-4 px-5">Indie hackers</td>
                      <td className="py-4 px-5 font-mono text-green-600 font-bold">$29,000</td>
                    </tr>
                    <tr className="hover:bg-[var(--paper)] transition-colors bg-purple-50">
                      <td className="py-4 px-5 font-bold text-purple-900">Executive</td>
                      <td className="py-4 px-5 text-purple-900">$99/mo</td>
                      <td className="py-4 px-5 text-purple-900">Founders / Power users</td>
                      <td className="py-4 px-5 font-mono text-purple-600 font-bold">$99,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 border-2 border-[var(--ink)] border-dashed bg-blue-50 rounded text-sm text-gray-800 shadow-[3px_3px_0_var(--ink)]">
                <strong className="text-[var(--blue)]">Cost Note:</strong> Because we use local models for monitoring, compute cost is $0 until trigger. Even power users burning $15/mo in API credits yield an <strong>85% gross margin</strong> at the $99/mo tier.
              </div>
            </div>

            <div className="mt-16 pt-10 border-t-2 border-dashed border-[var(--ink)] text-center">
              <p className="font-mono text-[15px] font-bold text-[var(--ink)] mb-8 max-w-2xl mx-auto leading-relaxed p-6 bg-[var(--yellow)] rounded shadow-[4px_4px_0_var(--ink)] border-2 border-[var(--ink)] transform -rotate-1">
                &quot;Yes, having MYLO code an app for you burns 5 cents in API credits. But it saves you 4 hours of your life. What is your time worth?&quot;
              </p>
              <button className="ink-button text-xl px-10 py-5 shadow-[6px_6px_0_var(--blue)] transform transition-transform cursor-default pointer-events-none">
                LFG. 🚀
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer shell text-center pb-8" style={{ borderTop: '2px dashed var(--ink)' }}>
        <p className="copyright mx-auto text-sm font-bold bg-[var(--ink)] text-white inline-block px-4 py-2 mt-4 rounded">
          CONFIDENTIAL MARKETING DOCUMENT // <span className="text-[var(--yellow)]">CMD+P TO PRINT TO PDF</span>
        </p>
      </footer>
    </main>
  )
}
