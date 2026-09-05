'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, CircleDot, Code2, Download, Eye, EyeOff, GitBranch, GraduationCap, LockKeyhole, Menu, Mic2, Monitor, MousePointer2, Play, ShieldCheck, Sparkles, Terminal, Tv, Video, X } from 'lucide-react'
import Link from 'next/link'
import { PlatformStatus } from '@/components/platform-status'

const modes = {
  coach: { label: 'COACH MODE', title: 'Learn by doing, not watching.', copy: 'MYLO sees your screen and gently guides you through the exact next move.', color: 'yellow', icon: Sparkles },
  do: { label: 'DO MODE', title: 'Make the boring bits disappear.', copy: 'Give MYLO a task. It moves a ghost cursor, pauses at safety gates, and lets you approve every action.', color: 'blue', icon: MousePointer2 },
  ask: { label: 'ASK MODE', title: 'Answers, right where you need them.', copy: 'Highlight an error, graph, or confusing UI. Press Alt + Space and get a useful explanation without leaving your flow.', color: 'green', icon: Mic2 },
} as const

type Mode = keyof typeof modes

function RoughCircle({ className = '' }: { className?: string }) {
  return <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M5 49 C5 18 25 5 53 7 C83 4 97 22 95 52 C98 81 77 96 48 94 C17 97 2 79 5 49Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 2 12 3" strokeLinecap="round" /></svg>
}
function RoughArrow() { return <svg className="scribble-arrow absolute" viewBox="0 0 180 100" aria-hidden="true"><path d="M8 15 C74 12 112 30 136 73" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M119 70 L137 76 L137 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PencilLoop() { return <svg className="pencil-loop" viewBox="0 0 520 125" preserveAspectRatio="none" aria-hidden="true"><path d="M62 24 C174 45 330 43 443 62 C492 70 493 91 447 103 C345 128 170 119 78 99 C37 90 34 67 62 49 C111 18 191 10 284 8" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M62 25 C168 47 328 44 441 63" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".55"/></svg> }
function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</div> }

export default function Page() {
  const [mode, setMode] = useState<Mode>('coach')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [platform, setPlatform] = useState<'mac' | 'linux' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const ActiveIcon = modes[mode].icon
  const showComingSoon = (target: 'mac' | 'linux') => {
    setPlatform(target)
    setMenuOpen(false)
  }
  return <main>
    <nav className="nav shell">
      <a href="#top" className="brand" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">✳</span>
        <span><strong>MYLO</strong><small>[os-native engine]</small></span>
      </a>
      <div className="nav-links">
        <a href="#modes">Modes</a>
        <a href="#privacy">Stealth</a>
        <a href="#architecture">Architecture</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="nav-actions">
        <a href="#pricing" className="sketch-button nav-download">
          <Download size={15}/> Get the source <small>(pre-release)</small>
        </a>
        <button className="platform-trigger" onClick={() => showComingSoon('mac')} aria-label="See macOS availability">
          <img src="/apple.svg" alt="" />
        </button>
        <button className="platform-trigger" onClick={() => showComingSoon('linux')} aria-label="See Linux availability">
          <img src="/linux.svg" alt="" />
        </button>
      </div>
      <button 
        className={`mobile-menu ${menuOpen ? 'active' : ''}`} 
        onClick={() => setMenuOpen(!menuOpen)} 
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20}/> : <Menu size={20}/>}
      </button>

      {menuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-links">
            <a href="#modes" onClick={() => setMenuOpen(false)}>
              <span>01. Modes</span> <ArrowRight size={14}/>
            </a>
            <a href="#privacy" onClick={() => setMenuOpen(false)}>
              <span>02. Stealth Mode</span> <ArrowRight size={14}/>
            </a>
            <a href="#architecture" onClick={() => setMenuOpen(false)}>
              <span>03. Architecture</span> <ArrowRight size={14}/>
            </a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>
              <span>04. Pricing</span> <ArrowRight size={14}/>
            </a>
            <Link href="/contact" onClick={() => setMenuOpen(false)}>
              <span>05. Contact Us</span> <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="mobile-nav-actions">
            <a href="#pricing" className="sketch-button" onClick={() => setMenuOpen(false)}>
              <Download size={15}/> Get the source (pre-release)
            </a>
            <div className="mobile-nav-platforms">
              <button className="mobile-nav-platform-btn" onClick={() => showComingSoon('mac')}>
                <img src="/apple.svg" alt="" /> macOS (Soon)
              </button>
              <button className="mobile-nav-platform-btn" onClick={() => showComingSoon('linux')}>
                <img src="/linux.svg" alt="" /> Linux (Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
    {menuOpen && <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} />}

    <section id="top" className="hero shell"><div className="hero-copy"><div className="status-wrap"><div className="status"><CircleDot size={14}/> Pre-release <span>•</span> Build from source on Windows &amp; macOS</div><PencilLoop/></div><h1>MYLO : Motion. Your Live Operator. <em>The AI that moves with you.</em></h1><p className="lede">No sidebar chat. No switching windows. MYLO overlays real-time coaching annotations directly over DaVinci, Blender, Excel, or your terminal. <strong>And to everyone else on your call, stream, or screen share — it doesn&apos;t exist.</strong></p><div className="cta-row"><a href="https://github.com/Aryan-Protein-Vala/MyloOS/releases" className="ink-button">Build from source <span>(Bring Your Own Key)</span><ArrowRight size={17}/></a><a href="#pricing" className="paper-button">Pro plan <span>(planned)</span></a></div><div className="hero-note"><RoughArrow/><span>your new co-pilot</span></div></div>
      <DesktopMockup /></section>

    <section id="modes" className="section shell"><SectionTitle eyebrow="three ways to work" title="MYLO stays out of the way. Until you need it."><p>One shortcut. Three superpowers. Zero context switching.</p></SectionTitle><div className="mode-tabs" role="tablist" aria-label="MYLO modes">{Object.entries(modes).map(([key, item]) => <button key={key} role="tab" aria-selected={mode === key} className={`mode-tab ${mode === key ? 'active' : ''} ${item.color}`} onClick={() => setMode(key as Mode)}><item.icon size={18}/><span>{item.label}</span></button>)}</div><div className={`mode-panel ${modes[mode].color}`}><div className="mode-text"><span className="eyebrow">{modes[mode].label}</span><h3>{modes[mode].title}</h3><p>{modes[mode].copy}</p><ul><li><Check size={16}/> Wobbly, human-feeling overlays</li><li><Check size={16}/> Real-time vision, no screenshots saved</li><li><Check size={16}/> Always asks before it acts</li></ul></div><div className="mode-preview"><div className="preview-top"><span/><span/><span/> <small>MYLO / {modes[mode].label}</small></div><div className="preview-body">{mode === 'coach' && <><div className="fake-toolbar"><Code2 size={16}/> untitled.blend <span>•••</span></div><div className="fake-lines"><i/><i/><i className="short"/><i/><i className="medium"/></div><div className="coach-callout"><b>1</b> Select the object first<RoughCircle/></div><div className="cursor-hand">⌁</div></>}{mode === 'do' && <><div className="task-card"><MousePointer2 size={19}/><b>Rename 12 project files</b><small>MYLO is ready to help</small><button className="mini-approve">Approve <ArrowRight size={13}/></button></div><div className="ghost-cursor"><MousePointer2 size={26}/><span>safe checkpoint</span></div></>}{mode === 'ask' && <><div className="terminal-window"><Terminal size={16}/><span>build.log</span><p>ERROR: module not found<br/><strong>› what does this mean?</strong></p></div><div className="ask-card"><div className="audio"><span/><span/><span/><span/><span/><span/><span/><span/></div><b>Looks like a missing dependency.</b><p>Try installing the package, then run the build again.</p></div></>}</div></div></div></section>

    <section id="privacy" className="stealth-section"><div className="stealth-bg"/><div className="shell stealth-shell"><div className="stealth-badge"><EyeOff size={16}/> STEALTH MODE</div><h2 className="stealth-headline">Invisible to everyone<br/><em>but you.</em></h2><p className="stealth-sub">Zoom calls. OBS streams. Discord screenshares. Online meetings. MYLO&apos;s overlay uses OS-native capture exclusion — <strong>WDA_EXCLUDEFROMCAPTURE</strong> on Windows, <strong>NSWindow.sharingType</strong> on macOS — so the overlay is left out of the capture buffer by the OS itself rather than hidden by an app-layer trick. Your notes stay yours; your screen share stays clean. (Windows needs version 2004 or newer for this; on older builds MYLO tells you it cannot protect the overlay.)</p><div className="stealth-toggle-note"><ShieldCheck size={16}/> Toggle visibility anytime in Settings. You&apos;re always in control.</div><StealthDemo/><div className="stealth-audience"><AudienceCard icon={<Video size={22}/>} label="Streamers" desc="Keep coaching and reminders on your monitor without them baking into the stream your viewers are watching."/><AudienceCard icon={<Tv size={22}/>} label="Remote Workers" desc="Keep your own notes and prompts on screen while you present, without them landing in the recording or the shared window."/><AudienceCard icon={<GraduationCap size={22}/>} label="Students" desc="Research papers, debug code, and learn new concepts with an always-on AI study buddy that never clutters your screen."/><AudienceCard icon={<Play size={22}/>} label="YouTubers" desc="Record tutorials with a hidden teleprompter and research assistant. Clean footage, every time."/></div><div className="stealth-specs"><div><strong>0 pixels leaked</strong><span>Excluded at the OS compositor level, on Windows 10 2004+ and on macOS.</span></div><div><strong>Global panic key</strong><span>One shortcut hides every overlay and cancels any pending action — even when MYLO has no focus.</span></div><div><strong>No screenshots saved</strong><span>A capture is encoded in memory, sent to your provider, and dropped. Nothing is written to disk.</span></div></div></div></section>

    <section id="architecture" className="section ruled-section"><div className="shell"><SectionTitle eyebrow="under the hood" title="Native speed. Human-scale design."><p>We built MYLO close to the metal so your workflow can stay wonderfully messy.</p></SectionTitle><div className="spec-grid"><Spec icon={<Monitor/>} stat="WGC" title="Capture path" copy="Windows Graphics Capture on Windows, ScreenCaptureKit on macOS — both in Rust."/><Spec icon={<Sparkles/>} stat="Tauri" title="Native shell" copy="A Rust core with the OS webview, rather than a bundled browser."/><Spec icon={<LockKeyhole/>} stat="WDA" title="Exclusion layer" copy="WDA_EXCLUDEFROMCAPTURE on Windows 10 2004+, NSWindowSharingNone on macOS."/><Spec icon={<ShieldCheck/>} stat="MIT" title="Open source" copy="Every line is on GitHub. Build it yourself and verify what it does."/></div></div></section>

    <section id="pricing" className="section shell"><SectionTitle eyebrow="simple, honest pricing" title="Bring your key. Or bring your coffee."><p>Start free. Upgrade when you want the magic handled for you.</p></SectionTitle><div className="pricing-grid"><PriceCard free title="Free Forever" price="$0" suffix="/ month" badge="Zero Markup • 100% Private" items={['Paste your own Gemini or OpenAI API key','Unlimited Ask and Do sessions','Key stored in your OS keychain','Overlay hidden from screen shares','Direct machine-to-API connection']} cta="Build from source"/><PriceCard title="Pro Managed" price="$15" suffix="/ month" badge="Planned — not yet available" items={['No API keys required — we would handle token costs','Managed model access','Higher session limits','Signed, notarised installers','Priority support']} cta="Join the waitlist"/></div></section>

    <section className="section shell faq-section"><SectionTitle eyebrow="you asked, we scribbled" title="Frequently asked questions."/><div className="faq-list">{[['Will MYLO slow down my games or apps?', 'MYLO is a Tauri shell around the OS webview, so it is far lighter than an Electron app, and it uses Windows Graphics Capture — the same API behind Xbox Game Bar. It only captures when you ask it to. We have not published benchmark numbers yet; when we do, they will be reproducible.'],['Can my stream audience or Zoom call see MYLO\'s overlays?', 'Not when the OS exclusion is active. MYLO asks the OS itself to leave the overlay out of the capture buffer — WDA_EXCLUDEFROMCAPTURE on Windows, NSWindowSharingNone on macOS — so it is not an app-layer trick and OBS, Zoom, Discord and Teams simply never receive those pixels. The Windows flag needs Windows 10 version 2004 or newer; on older builds MYLO tells you the overlay is not protected rather than pretending it is.'],['Can MYLO do things on my computer without my permission?', 'No. Do Mode stops at an approval gate showing the exact action and the exact screen coordinates before anything happens. The gate lives in the Rust core, not the UI: the backend refuses to inject any input that was not explicitly approved, and refuses to act at all while the overlay is still on screen. There is also a global panic shortcut that hides the overlay and cancels any pending action even when MYLO has no focus.'],['Which AI models does MYLO work with?', 'Today: Google Gemini and OpenAI. You supply your own API key, MYLO stores it in your OS keychain, and your machine talks to the provider directly — no middleman and no markup. A managed tier that removes the need for a key is planned, but it does not exist yet.'],['Is MYLO just for Windows? When does Mac come out?', 'MYLO is pre-release on both platforms. Windows and macOS support are both in the repository and you can build either from source today. We have not shipped signed, notarised installers yet, so there is nothing in the Microsoft Store or on a download page. Linux is on the roadmap.']].map(([q, a], i) => <div className="faq-item" key={q}><button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}><span>{q}</span><ChevronDown size={19}/></button>{openFaq === i && <p>{a}</p>}</div>)}</div></section>

    {platform && <div className="platform-modal-backdrop" role="presentation" onClick={() => setPlatform(null)}><section className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="platform-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setPlatform(null)} aria-label="Close dialog"><X size={18}/></button><div className="modal-icon"><img src={platform === 'mac' ? '/apple.svg' : '/linux.svg'} alt="" /></div><span className="eyebrow">{platform === 'mac' ? 'macOS universal build' : 'Linux desktop build'}</span><h2 id="platform-title">{platform === 'mac' ? 'macOS is in the repo.' : 'Linux is on the roadmap.'}</h2><p>{platform === 'mac' ? 'The macOS build works but is not signed or notarised yet, so you will need to build it from source. Email us and we will tell you when installers land.' : 'Linux support has not started. Email us if you want to be told when it does.'}</p><a className="ink-button" href="mailto:aryansharma24112003@gmail.com?subject=MYLO%20platform%20updates" onClick={() => setPlatform(null)}>Keep me posted <ArrowRight size={16}/></a><small className="modal-note">Pre-release. Buildable from source on Windows and macOS today.</small></section></div>}

    <footer className="footer shell"><div className="brand"><span className="brand-mark">✳</span><span><strong>MYLO</strong><small>[os-native engine]</small></span></div><div className="footer-links"><a href="https://github.com/Aryan-Protein-Vala/MyloOS" target="_blank" rel="noopener noreferrer">GitHub <GitBranch size={15}/></a><Link href="/contact">Contact Us <ArrowUpRight size={15}/></Link><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a></div><PlatformStatus/><p className="copyright">© 2026 MYLO. Made for curious humans.</p></footer>
  </main>
}

function DesktopMockup() { return <div className="desktop-mockup"><div className="window-bar"><span className="window-title"><CircleDot size={12}/> MYLO / coach overlay</span><span>— □ ×</span></div><div className="desktop-content"><aside><span className="side-active">⌂</span><span>◫</span><span>◌</span><span>⚙</span></aside><div className="editor"><div className="editor-menu">File　 Edit　 View　 Export　 Help</div><div className="editor-stage"><div className="stage-shape"/><div className="stage-shape small"/><span className="stage-label">composition_04</span><div className="target-button">③ Click Export<RoughCircle/></div><RoughArrow/><div className="spotlight"/><div className="speech"><b>MYLO says:</b><br/>I&apos;ll watch you click this step before we move to step 4!</div><div className="avatar">✳</div></div><div className="editor-footer">● 00:12:48　　▶ timeline　　▰ export settings</div></div></div><div className="mock-caption"><span>live screen context</span><span><CircleDot size={12}/> recording locally</span></div></div> }
function StealthDemo() { return <div className="stealth-demo"><div className="stealth-pane them"><div className="pane-label"><EyeOff size={14}/> What Zoom / OBS sees</div><div className="pane-screen"><div className="pane-bar"><span/><span/><span/><small>presentation_final.pptx</small></div><div className="pane-body"><div className="pane-slide"><span className="slide-title">Q3 Revenue Report</span><div className="slide-chart"><i style={{height:'60%'}}/><i style={{height:'80%'}}/><i style={{height:'45%'}}/><i style={{height:'90%'}}/><i style={{height:'70%'}}/></div></div></div><div className="clean-badge"><Check size={13}/> Clean screen — no AI visible</div></div></div><div className="stealth-vs"><span>VS</span></div><div className="stealth-pane you"><div className="pane-label"><Eye size={14}/> What you actually see</div><div className="pane-screen"><div className="pane-bar"><span/><span/><span/><small>presentation_final.pptx</small></div><div className="pane-body"><div className="pane-slide"><span className="slide-title">Q3 Revenue Report</span><div className="slide-chart"><i style={{height:'60%'}}/><i style={{height:'80%'}}/><i style={{height:'45%'}}/><i style={{height:'90%'}}/><i style={{height:'70%'}}/></div></div><div className="mylo-overlay-card"><div className="overlay-dot">✳</div><b>MYLO whispers:</b><p>&quot;Revenue is up 23% — mention the APAC expansion as the driver.&quot;</p></div><div className="mylo-overlay-hint"><span>③ Next slide: cost breakdown</span><RoughCircle className="hint-circle"/></div></div></div></div></div> }
function AudienceCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) { return <article className="audience-card"><div className="audience-icon">{icon}</div><h4>{label}</h4><p>{desc}</p></article> }
function Spec({ icon, stat, title, copy }: { icon: React.ReactNode; stat: string; title: string; copy: string }) { return <article className="spec-card"><div className="spec-icon">{icon}</div><strong>{stat}</strong><h3>{title}</h3><p>{copy}</p></article> }
function PriceCard({ free, title, price, suffix, badge, items, cta }: { free?: boolean; title: string; price: string; suffix: string; badge: string; items: string[]; cta: string }) { return <article className={`price-card ${free ? 'free' : 'pro'}`}><div className="price-head"><span className="eyebrow">{title}</span><span className="price-badge">{badge}</span><div><strong>{price}</strong><span>{suffix}</span></div>{!free && <small>or $144 / year</small>}</div><ul>{items.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul><a href="#top" className={free ? 'paper-button' : 'ink-button'}>{cta}<ArrowRight size={16}/></a></article> }
function ArrowUpRight({ size }: { size: number }) { return <ArrowDownRight size={size} className="up-right"/> }
