'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function FAQPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    ['Will this burn my laptop to a crisp?', 'Only if you\'re running it on a 2012 ThinkPad. Nah, MYLO is crazy optimized. The Rust core uses less RAM than your 50 open Chrome tabs. Big bois only need to worry if they\'re compiling the Linux kernel while running 3 local LLMs at the same time.'],
    ['Can my boss or Twitch chat see MYLO?', 'No. Not a CSS trick. Not an overlay hack. OS-level pixel exclusion. The pixels literally do not exist in the capture buffer. You just look suspiciously cracked at your job.'],
    ['What if MYLO deletes my production database?', 'MYLO always asks for approval before going rogue (Yoink mode has a safe checkpoint). But hey, if it deletes your DB, maybe your schema was trash and MYLO did you a solid. (Kidding... mostly).'],
    ['Do I need an OpenAI API key?', 'Yep. Bring your own keys (BYOK). We\'re not paying for your 100k token context windows when you ask MYLO to read the entire Harry Potter series.'],
    ['Is MYLO going to steal my code and train on it?', 'Hell nah. We aren\'t one of those shady corps. Everything runs through your own API keys or our zero-retention Enterprise endpoints. Local memory is stored locally in Cortex. We don\'t want your spaghetti code anyway.'],
    ['Why not just use GitHub Copilot?', 'Because Copilot lives in your IDE and can\'t use your web browser, read your PDFs, or click buttons on a dashboard. MYLO is an OS-level agent. It doesn\'t just write code; it actually does the whole workflow.'],
    ['Does this work on Windows/Linux?', 'Mac first for V1 because we\'re Apple fanboys. Windows and Linux are coming soon once we figure out how to stop Windows Defender from thinking our rust binary is a rootkit.'],
    ['What happens if MYLO hallucinates?', 'It does. All AI does right now. But because MYLO is Agentic and can actually read the screen, it typically catches its own errors. Plus, you literally watch it work like a ghost cursor. If it goes off the rails, you just hit ESC twice.'],
    ['Can I make MYLO do my homework?', 'Yes, and it won\'t even show up on the screen recording when your professor makes you use LockDown Browser. (But for legal reasons: Please study).'],
    ['Is the KITCHEN SINK tab just old UI you didn\'t want to delete?', '...maybe. But honestly, Coach Mode and Ask Mode are goated and we refused to let them die.']
  ]

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#1e1e1e] font-sans">
      <nav className="nav shell" style={{ borderBottom: '2px solid var(--ink)' }}>
        <div className="brand">
          <span className="brand-mark">✳</span>
          <Link href="/"><span><strong>MYLO</strong><small>[os-native agent]</small></span></Link>
        </div>
        <div className="nav-actions">
          <Link href="/" className="ink-button" style={{ display: 'flex', gap: '8px', padding: '10px 16px', fontSize: '13px' }}>
            <ArrowLeft size={16}/> Back Home
          </Link>
        </div>
      </nav>

      <main className="shell section" style={{ maxWidth: '800px' }}>
        <div className="section-heading" style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span className="status" style={{ display: 'inline-flex', margin: '0 auto 20px' }}>FOR WORRIED NERDS</span>
          <h1 style={{ margin: '0 auto' }}>More questions.</h1>
          <p style={{ marginTop: '20px' }}>Read these before you drop angry comments on our Twitter.</p>
        </div>

        <div className="faq-list">
          {faqs.map(([q, a], i) => (
            <div className="faq-item" key={q} style={{ borderBottom: '2px solid var(--ink)', padding: '24px 0' }}>
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)} 
                aria-expanded={openFaq === i}
                style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', fontWeight: 'bold', fontSize: '20px', letterSpacing: '-0.02em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ paddingRight: '20px' }}>{q}</span>
                <ChevronDown size={24} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}/>
              </button>
              {openFaq === i && (
                <p style={{ marginTop: '16px', color: '#444', fontSize: '15px', lineHeight: '1.6', animation: 'fade-in 0.2s ease' }}>
                  {a}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
