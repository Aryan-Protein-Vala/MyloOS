'use client'

import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleDot, Eye, EyeOff, GitBranch, GraduationCap, LockKeyhole, Menu, Monitor, MousePointer2, Play, ShieldCheck, Network, Zap, Cpu, Terminal, Tv, Video, X, ArrowDownRight, Package } from 'lucide-react'
import Link from 'next/link'

const modes = {
  yoink: { label: 'OS TAKEOVER (YOINK)', title: 'We don\'t just point. We literally click.', copy: 'Speak the task, step back, and watch the ghost cursor hijack your IDE, browser, or video editor and actually do the grunt work. No screenshots. No hallucinations. Just results.', color: 'blue', icon: MousePointer2 },
  cortex: { label: 'CORTEX', title: 'An AI that actually knows you.', copy: 'Your messy code, your weird project names, that chat you had three days ago—remembered. Every session gets smarter. It stops being a tool and starts being a teammate.', color: 'purple', icon: Network },
  orchestrator: { label: 'BACKGROUND AGENT', title: 'Because you have a life.', copy: 'Tell MYLO to scrape 200 competitors, post your content, market for you, or pull leads. No more messy n8n workflow type sh*t. It handles it quietly in the background and pings you when done.', color: 'green', icon: Terminal },
  v1: { label: 'THE KITCHEN SINK', title: 'The OG features you didn\'t ask for but we delivered.', copy: 'We didn\'t kill the classics. Use ASK MODE for quick voice questions, COACH MODE when you actually want to learn how to do it yourself, and DO MODE when you want MYLO to take the wheel. All the OG goodness packed into one tab.', color: 'yellow', icon: Package },
} as const

type Mode = keyof typeof modes

function CortexHover({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-block cursor-help">
      <span className="relative inline-block font-bold text-[var(--purple)]" style={{ textDecoration: 'underline wavy #8b5cf6 2px', textUnderlineOffset: '4px' }}>
        {children}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-[340px] -translate-x-1/2 rounded bg-[var(--ink)] p-4 text-sm leading-relaxed text-[var(--paper)] opacity-0 transition-opacity group-hover:opacity-100 z-50 text-left font-mono shadow-[6px_6px_0_var(--purple)]">
        <strong>Universal Cortex</strong><br /><br />
        It's a shared memory + language layer so all your AIs can finally talk to each other without acting like dumb goldfishes.<br /><br />
        It runs on an Ebbinghaus decay curve (good luck pronouncing that shit) to forget the junk and remember what actually matters.
        <svg className="absolute top-full left-1/2 -ml-2 h-4 w-4 text-[var(--ink)]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21l-12-18h24z" />
        </svg>
      </span>
    </span>
  )
}

function RoughCircle({ className = '' }: { className?: string }) {
  return <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M5 49 C5 18 25 5 53 7 C83 4 97 22 95 52 C98 81 77 96 48 94 C17 97 2 79 5 49Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 2 12 3" strokeLinecap="round" /></svg>
}
function RoughArrow() { return <svg className="scribble-arrow absolute" viewBox="0 0 180 100" aria-hidden="true"><path d="M8 15 C74 12 112 30 136 73" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M119 70 L137 76 L137 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PencilLoop() { return <svg className="pencil-loop" viewBox="0 0 520 125" preserveAspectRatio="none" aria-hidden="true"><path d="M62 24 C174 45 330 43 443 62 C492 70 493 91 447 103 C345 128 170 119 78 99 C37 90 34 67 62 49 C111 18 191 10 284 8" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M62 25 C168 47 328 44 441 63" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".55" /></svg> }
function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</div> }

export default function Page() {
  const [mode, setMode] = useState<Mode>('yoink')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [menuOpen, setMenuOpen] = useState(false)

  return <main>
    <nav className="nav shell">
      <a href="#top" className="brand" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">✳</span>
        <span><strong>MYLO</strong><small>[os-native agent]</small></span>
      </a>
      <div className="nav-links">
        <a href="#modes">Cortex</a>
        <a href="#privacy">Stealth</a>
        <a href="#architecture">Architecture</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="nav-actions">
        <Link href="/early-access" className="sketch-button nav-download">
          <Zap size={15} /> V1 Early Access
        </Link>
      </div>
      <button
        className={`mobile-menu ${menuOpen ? 'active' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {menuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-links">
            <a href="#modes" onClick={() => setMenuOpen(false)}><span>01. The Cortex</span> <ArrowRight size={14} /></a>
            <a href="#privacy" onClick={() => setMenuOpen(false)}><span>02. Stealth Mode</span> <ArrowRight size={14} /></a>
            <a href="#architecture" onClick={() => setMenuOpen(false)}><span>03. Architecture</span> <ArrowRight size={14} /></a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}><span>04. Pricing</span> <ArrowRight size={14} /></a>
          </div>
          <div className="mobile-nav-actions">
            <Link href="/early-access" className="sketch-button" onClick={() => setMenuOpen(false)}>
              <Zap size={15} /> Get V1 Early Access
            </Link>
          </div>
        </div>
      )}
    </nav>
    {menuOpen && <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} />}

    {/* HERO */}
    <section id="top" className="hero shell">
      <div className="hero-copy">
        <div className="status-wrap">
          <div className="status"><CircleDot size={14} /> V1 Early Access <span>•</span> Spots Limited</div>
          <PencilLoop />
        </div>
        <h1>MYLO: The AI that runs your computer.<br /><em className="text-[var(--blue)] block mt-2 text-[0.8em]">The realest thing since Iron Man&apos;s suit.</em></h1>
        <p className="lede">Hold a hotkey, say the task out loud. MYLO hijacks your screen with a ghost cursor and just… does it. Powered by <CortexHover>Cortex</CortexHover>, it remembers everything—your projects, your preferences, your chaos. <strong>No corporate fluff. Just an AI that actually works.</strong></p>
        <div className="cta-row">
          <Link href="/early-access" className="ink-button">Get Early Access <ArrowRight size={16} /></Link>
          <a href="#modes" className="paper-button">See How It Works <ArrowRight size={16} /></a>
        </div>
        <div className="hero-note"><RoughArrow /><span>your autonomous copilot</span></div>
      </div>
      <DesktopMockup />
    </section>

    {/* MODES */}
    <section id="modes" className="section shell">
      <SectionTitle eyebrow="three ridiculous superpowers" title="MYLO chills in the corner. Until you call it.">
        <p>One hotkey. Speak. Watch it go. That&apos;s literally the whole thing.</p>
      </SectionTitle>
      <div className="mode-tabs" role="tablist" aria-label="MYLO modes">
        {Object.entries(modes).map(([key, item]) => (
          <button key={key} role="tab" aria-selected={mode === key} className={`mode-tab ${mode === key ? 'active' : ''} ${item.color}`} onClick={() => setMode(key as Mode)}>
            <item.icon size={18} /><span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={`mode-panel ${modes[mode].color}`}>
        <div className="mode-text">
          <span className="eyebrow">{modes[mode].label}</span>
          <h3>{modes[mode].title}</h3>
          <p>{modes[mode].copy}</p>
          <ul>
            <li><Check size={16} /> Human-feeling overlays, not robotic popups</li>
            <li><Check size={16} /> Real-time vision — nothing saved to disk</li>
            <li><Check size={16} /> Asks before it does anything scary</li>
          </ul>
        </div>
        <div className="mode-preview">
          <div className="preview-top"><span /><span /><span /> <small>MYLO / {modes[mode].label}</small></div>
          <div className="preview-body">
            {mode === 'yoink' && <><div className="task-card"><MousePointer2 size={19} /><b>Rename 12 project files</b><small>MYLO is on standby</small><button className="mini-approve">Approve <ArrowRight size={13} /></button></div><div className="ghost-cursor"><MousePointer2 size={26} /><span>safe checkpoint</span></div></>}
            {mode === 'cortex' && <><div className="fake-toolbar"><Network size={16} /> cortex_memory.bin <span>•••</span></div><div className="fake-lines"><i /><i /><i className="short" /><i /><i className="medium" /></div><div className="coach-callout"><b>Linked</b> Remembered your messy React structure<RoughCircle /></div></>}
            {mode === 'orchestrator' && <><div className="terminal-window"><Terminal size={16} /><span>background.log</span><p>SPAWNING: HTTP Agent...<br /><strong>› doing the boring stuff for you</strong></p></div><div className="ask-card"><div className="audio"><span /><span /><span /><span /><span /><span /><span /><span /></div><b>Done. Go check your CRM.</b><p>50 leads pulled while you were eating lunch. You&apos;re welcome.</p></div></>}
            {mode === 'v1' && <><div className="coach-callout" style={{ right: '40px', top: '70px', transform: 'rotate(2deg)' }}><b>Coach Mode</b> <br />Open Terminal, I&apos;ll walk you through the Git rebase.<RoughCircle /></div><div className="ask-card" style={{ top: '150px', left: '15%' }}><div className="audio"><span /><span /><span /><span /><span /><span /><span /><span /></div><b>Ask Mode</b><p>You asked: "What is this error?"</p></div></>}
          </div>
        </div>
      </div>
    </section>

    {/* STEALTH */}
    <section id="privacy" className="stealth-section">
      <div className="stealth-bg" />
      <div className="shell stealth-shell">
        <div className="stealth-badge"><EyeOff size={16} /> STEALTH MODE</div>
        <h2 className="stealth-headline">Invisible to everyone<br /><em>but you.</em></h2>
        <p className="stealth-sub">Your Zoom call is live. Your stream is running. MYLO&apos;s overlay exists nowhere except your eyeballs. We use <strong>WDA_EXCLUDEFROMCAPTURE</strong> on Windows and <strong>NSWindow.sharingType</strong> on macOS — actual OS-level pixel exclusion, not a CSS trick. Nobody sees it. Ever.</p>
        <div className="stealth-toggle-note"><ShieldCheck size={16} /> Flip it on or off from Settings whenever you want. You&apos;re the boss.</div>
        <StealthDemo />
        <div className="stealth-audience">
          <AudienceCard icon={<Video size={22} />} label="Streamers" desc="Live coaching on Twitch with MYLO whispering tactics. Your chat sees nothing. Your teammates are impressed." />
          <AudienceCard icon={<Tv size={22} />} label="Remote Workers" desc="MYLO sits in your Zoom calls, pulling context and drafting replies in real time. You just look really smart." />
          <AudienceCard icon={<GraduationCap size={22} />} label="Students" desc="Debug code, write essays, understand confusing papers — with a study buddy that never shows up on the screen capture." />
          <AudienceCard icon={<Play size={22} />} label="YouTubers" desc="Record tutorials with a hidden teleprompter and instant research assistant. Clean footage, zero stress." />
        </div>
        <div className="stealth-specs">
          <div><strong>0 pixels leaked</strong><span>OS compositor-level exclusion. DirectX on Windows, Core Graphics on Mac.</span></div>
          <div><strong>ESC × 2 = gone</strong><span>Double-tap Escape and every overlay and input handle vanishes instantly.</span></div>
          <div><strong>Nothing hits disk</strong><span>Frames live in volatile GPU memory. No recordings. No uploads. No receipts.</span></div>
        </div>
      </div>
    </section>

    {/* ARCHITECTURE */}
    <section id="architecture" className="section ruled-section">
      <div className="shell">
        <SectionTitle eyebrow="under the hood" title="Raw metal. No apologies.">
          <p>We wrote it in Rust so it doesn&apos;t eat your RAM and ruin your framerate like every other &quot;AI desktop app&quot;.</p>
        </SectionTitle>
        <div className="spec-grid">
          <Spec icon={<Monitor />} stat="0.02s" title="Capture latency" copy="Windows Graphics Capture + Core Graphics. Zero middlemen." />
          <Spec icon={<Cpu />} stat="~35MB" title="RAM usage" copy="A Tauri shell so light it&apos;s basically air. Your RAM is safe." />
          <Spec icon={<LockKeyhole />} stat="WDA" title="Exclusion layer" copy="Screen recorders, Discord, OBS — none of them can see MYLO." />
          <Spec icon={<ShieldCheck />} stat="0 warnings" title="Install friction" copy="MSIX on Windows, universal binary on Mac. No scary prompts." />
        </div>
      </div>
    </section>

    {/* PRICING */}
    <section id="pricing" className="section shell">
      <SectionTitle eyebrow="honest pricing, no gotchas" title="Your keys or ours. Either way.">
        <p>Free if you&apos;re cheap. Worth it if you&apos;re smart. <CortexHover>Cortex</CortexHover> is where it gets wild.</p>
      </SectionTitle>
      <div className="pricing-grid">
        <PriceCard free title="MYLO Free (BYOK)" price="$0" suffix="/ month" badge="100% Private • Full Takeover" items={['Plug in your own API keys — OpenRouter, OpenAI, Anthropic, ElevenLabs. You pay the APIs, we charge nothing.', 'Full GUI takeover, voice, ghost clicks — the works', 'Local wake word & on-device OCR', 'Basic goldfish memory — remembers the session, but wakes up with zero braincells tomorrow']} cta="Grab Free Access" />
        <PriceCard title="MYLO Pro" price="$14.99" suffix="/ month" badge="Most Popular • Cortex Enabled" items={[<span key="1"><CortexHover>Cortex</CortexHover> switched on — it starts knowing you</span>, 'No API keys needed. Token budget included.', 'Claude 3.5 Sonnet + GPT-4o, managed by us', 'Your workflows survive session restarts']} cta="Get Pro Access" />
        <PriceCard elite title="MYLO Elite" price="$49.99" suffix="/ month" badge="The Whole Damn Thing" items={['Unlimited Cortex memory — it never forgets anything', 'Heavy reasoning models: Claude 4.6, o3', 'Background agent spawning — works while you sleep', 'Premium ElevenLabs voice — it sounds alive']} cta="Get Elite Access" />
      </div>
    </section>

    {/* FAQ */}
    <section className="section shell faq-section">
      <SectionTitle eyebrow="okay but what about—" title="Questions you were too scared to ask." />
      <div className="faq-list">
        {[
          ['Will this burn my laptop to a crisp?', 'Only if you\'re running it on a 2012 ThinkPad. Nah, MYLO is crazy optimized. The Rust core uses less RAM than your 50 open Chrome tabs. Big bois only need to worry if they\'re compiling the Linux kernel while running 3 local LLMs at the same time.'],
          ['Can my boss or Twitch chat see MYLO?', 'No. Not a CSS trick. Not an overlay hack. OS-level pixel exclusion. The pixels literally do not exist in the capture buffer. You just look suspiciously cracked at your job.'],
          ['What if MYLO deletes my production database?', 'MYLO always asks for approval before going rogue (Yoink mode has a safe checkpoint). But hey, if it deletes your DB, maybe your schema was trash and MYLO did you a solid. (Kidding... mostly).'],
          ['Do I need an OpenAI API key?', 'Yep. Bring your own keys (BYOK). We\'re not paying for your 100k token context windows when you ask MYLO to read the entire Harry Potter series.'],
        ].map(([q, a], i) => (
          <div className="faq-item" key={q}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
              <span>{q}</span><ChevronDown size={19} />
            </button>
            {openFaq === i && <p>{a}</p>}
          </div>
        ))}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/faq" className="ink-button" style={{ display: 'inline-flex', padding: '10px 16px', fontSize: '13px' }}>Read More Unhinged FAQs</Link>
        </div>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="footer shell">
      <div className="brand"><span className="brand-mark">✳</span><span><strong>MYLO</strong><small>[os-native agent]</small></span></div>
      <div className="footer-links">
        <a href="https://github.com/Aryan-Protein-Vala/MyloOS" target="_blank" rel="noopener noreferrer">GitHub <GitBranch size={15} /></a>
        <Link href="/contact">Contact Us <ArrowDownRight size={15} /></Link>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms</a>
      </div>
      <div className="platforms"><span><i className="live" /> Windows: EARLY ACCESS</span><span><i className="live" /> macOS: EARLY ACCESS</span></div>
      <p className="copyright">© 2026 MYLO. Built by people who actually use their own product.</p>
    </footer>
  </main>
}

function DesktopMockup() { return <div className="desktop-mockup"><div className="window-bar"><span className="window-title"><CircleDot size={12} /> MYLO / OS Takeover</span><span>— □ ×</span></div><div className="desktop-content"><aside><span className="side-active">⌂</span><span>◫</span><span>◌</span><span>⚙</span></aside><div className="editor"><div className="editor-menu">File　 Edit　 View　 Export　 Help</div><div className="editor-stage"><div className="stage-shape" /><div className="stage-shape small" /><span className="stage-label">composition_04</span><div className="target-button">③ Click Export<RoughCircle /></div><RoughArrow /><div className="spotlight" /><div className="speech"><b>MYLO says:</b><br />Got the window handle. Exporting now.</div><div className="avatar">✳</div></div><div className="editor-footer">● 00:12:48　　▶ timeline　　▰ export settings</div></div></div><div className="mock-caption"><span>live screen context</span><span><CircleDot size={12} /> agent running locally</span></div></div> }
function StealthDemo() { return <div className="stealth-demo"><div className="stealth-pane them"><div className="pane-label"><EyeOff size={14} /> What Zoom / OBS sees</div><div className="pane-screen"><div className="pane-bar"><span /><span /><span /><small>presentation_final.pptx</small></div><div className="pane-body"><div className="pane-slide"><span className="slide-title">Q3 Revenue Report</span><div className="slide-chart"><i style={{ height: '60%' }} /><i style={{ height: '80%' }} /><i style={{ height: '45%' }} /><i style={{ height: '90%' }} /><i style={{ height: '70%' }} /></div></div></div><div className="clean-badge"><Check size={13} /> Clean screen — no AI visible</div></div></div><div className="stealth-vs"><span>VS</span></div><div className="stealth-pane you"><div className="pane-label"><Eye size={14} /> What you actually see</div><div className="pane-screen"><div className="pane-bar"><span /><span /><span /><small>presentation_final.pptx</small></div><div className="pane-body"><div className="pane-slide"><span className="slide-title">Q3 Revenue Report</span><div className="slide-chart"><i style={{ height: '60%' }} /><i style={{ height: '80%' }} /><i style={{ height: '45%' }} /><i style={{ height: '90%' }} /><i style={{ height: '70%' }} /></div></div><div className="mylo-overlay-card"><div className="overlay-dot">✳</div><b>MYLO whispers:</b><p>&quot;Revenue up 23% — credit the APAC expansion.&quot;</p></div><div className="mylo-overlay-hint"><span>③ Next slide: cost breakdown</span><RoughCircle className="hint-circle" /></div></div></div></div></div> }
function AudienceCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) { return <article className="audience-card"><div className="audience-icon">{icon}</div><h4>{label}</h4><p>{desc}</p></article> }
function Spec({ icon, stat, title, copy }: { icon: React.ReactNode; stat: string; title: string; copy: string }) { return <article className="spec-card"><div className="spec-icon">{icon}</div><strong>{stat}</strong><h3>{title}</h3><p>{copy}</p></article> }
function PriceCard({ free, elite, title, price, suffix, badge, items, cta }: { free?: boolean; elite?: boolean; title: string; price: string; suffix: string; badge: string; items: React.ReactNode[]; cta: string }) { return <article className={`price-card ${elite ? 'elite' : free ? 'free' : 'pro'}`}><div className="price-head"><span className="eyebrow">{title}</span><span className="price-badge">{badge}</span><div><strong>{price}</strong><span>{suffix}</span></div>{!free && <small>Token budget included</small>}</div><ul>{items.map((item, i) => <li key={i}><Check size={16} />{item}</li>)}</ul><Link href="/early-access" className={free ? 'paper-button' : 'ink-button'}>{cta}<ArrowRight size={16} /></Link></article> }
