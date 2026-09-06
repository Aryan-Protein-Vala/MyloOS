'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, CircleDot, Zap, Network, MousePointer2, EyeOff, Key } from 'lucide-react'
import Link from 'next/link'

export default function EarlyAccessPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('https://formsubmit.co/ajax/aryansharma24112003@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          _subject: `🚨 New MYLO V1 Early Access Request from ${name}`,
          _autoresponse: `Hey ${name}! You're officially on the MYLO waitlist. We'll hit you up when V1 early access opens — probably with a lot less corporate energy than this email. Stay weird. — The MYLO team`,
          _template: 'table',
          _next: `${typeof window !== 'undefined' ? window.location.origin : ''}/early-access/confirmed`,
        }),
      })
      if (res.ok) {
        localStorage.setItem('mylo_early_access_applied', 'true')
        window.location.href = '/early-access/confirmed'
      } else {
        setError('Something went sideways. Try again?')
      }
    } catch {
      setError('Network hiccup. Are you online?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ea-page">
      <nav className="nav shell">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native agent]</small></span>
        </Link>
        <Link href="/" className="nav-back-link" style={{ marginLeft: 'auto' }}>
          <ArrowLeft size={14}/> Back to the good stuff
        </Link>
      </nav>

      <div className="ea-shell shell">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="ea-badge">
            <CircleDot size={13}/> V1 EARLY ACCESS <span>•</span> Limited Spots
          </div>
          <div style={{
            position: 'absolute',
            left: '100%',
            top: '0',
            width: '220px',
            color: 'var(--red)',
            font: '11px "Courier New", monospace',
            transform: 'rotate(4deg)',
            pointerEvents: 'none',
            marginLeft: '10px'
          }}>
            <svg viewBox="0 0 50 30" style={{ width: '40px', height: '24px', position: 'absolute', left: '-42px', top: '0px', stroke: 'var(--red)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M40 15 Q 20 5 5 15" />
              <path d="M12 7 L 5 15 L 15 20" />
            </svg>
            This wonky shape is a deliberate stylistic choice, I didn't f*ck up the CSS. Keep your eyes on the form.
          </div>
        </div>

        <h1 className="ea-title">
          You&apos;re about to get<br/>
          <em>seriously unfair</em> advantages.
        </h1>
        <p className="ea-sub">
          MYLO takes over your computer, executes tasks with a ghost cursor, remembers everything you&apos;ve ever worked on, and does background research while you nap. We&apos;re letting a small first batch in first. That&apos;s you, if you fill this out.
        </p>

        <div className="ea-grid">
          <form onSubmit={handleSubmit} className="ea-form">
            <div className="ea-field">
              <label htmlFor="ea-name">What do we call you?</label>
              <input
                id="ea-name"
                type="text"
                placeholder="Babu Rao Ganpatrao Apte"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="ea-field">
              <label htmlFor="ea-email">Where do we reach you?</label>
              <input
                id="ea-email"
                type="email"
                placeholder="baburao@startrack.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="ea-field">
              <label htmlFor="ea-role">What do you do all day?</label>
              <select
                id="ea-role"
                value={role}
                onChange={e => setRole(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">Pick one (honestly)</option>
                <option value="developer">Code Monkey (Developer/Engineer)</option>
                <option value="designer">Pixel Pusher (Designer/Creative)</option>
                <option value="founder">Stressed Founder (Building something)</option>
                <option value="student">Broke Student (Respect)</option>
                <option value="streamer">Professional Yapper (Streamer/Creator)</option>
                <option value="pm">Jira Ticket Master (Product Manager)</option>
                <option value="other">I just vibe (Other)</option>
              </select>
            </div>

            {error && <p className="ea-error">{error}</p>}

            <button type="submit" className="ink-button ea-submit" disabled={submitting}>
              {submitting ? 'Sending you in…' : <><Zap size={16}/> Lock In My Spot <ArrowRight size={16}/></>}
            </button>

            <p className="ea-fine-print">
              No spam. No &quot;synergy&quot;. No corporate newsletter. Just an email when your access is ready.
            </p>
          </form>

          <div className="ea-sidebar">
            <div className="ea-card">
              <span className="ea-card-icon"><MousePointer2 size={26} strokeWidth={1.5} /></span>
              <h3>Ghost Cursor Mode</h3>
              <p>MYLO literally hijacks your mouse. You get to sit back, sip chai, and watch it do the grunt work like a boss.</p>
            </div>
            <div className="ea-card purple">
              <span className="ea-card-icon"><Network size={26} strokeWidth={1.5} /></span>
              <h3>Cortex Memory</h3>
              <p>Remembers your messy codebase and weird variable names. Every AI you use shares this one gigabrain.</p>
            </div>
            <div className="ea-card green">
              <span className="ea-card-icon"><EyeOff size={26} strokeWidth={1.5} /></span>
              <h3>Stealth Overlay</h3>
              <p>OS-level pixel exclusion. Your boss on Zoom sees nothing. Look suspiciously productive while doing absolutely nothing.</p>
            </div>
            <div className="ea-card yellow">
              <span className="ea-card-icon"><Key size={26} strokeWidth={1.5} /></span>
              <h3>BYOK — Bring Your Own Key</h3>
              <p>Bring your own API keys. We don't want your money for OpenAI's compute. You pay them directly, we stay broke.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ea-page { min-height: 100vh; }
        .ea-shell { padding: 60px 0 100px; }
        .ea-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--yellow); border: 2px solid var(--ink); border-radius: 40px 30px 44px 36px; font: bold 11px 'Courier New', monospace; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 28px; }
        .ea-badge span { color: var(--red); }
        .ea-title { font-size: clamp(38px, 5vw, 68px); line-height: 1; letter-spacing: -.065em; max-width: 720px; margin-bottom: 22px; }
        .ea-title em { font-style: normal; text-decoration: underline wavy var(--blue) 3px; text-decoration-skip-ink: none; }
        .ea-sub { max-width: 600px; font-size: 17px; line-height: 1.6; color: #555; margin-bottom: 50px; }
        .ea-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
        .ea-form { display: flex; flex-direction: column; gap: 24px; background: #fff; border: 2px solid var(--ink); border-radius: 6px 16px 8px 12px; padding: 36px; box-shadow: 6px 6px 0 var(--ink); }
        .ea-field { display: flex; flex-direction: column; gap: 8px; }
        .ea-field label { font: bold 12px 'Courier New', monospace; text-transform: uppercase; letter-spacing: .04em; color: var(--ink); }
        .ea-field input, .ea-field select { padding: 14px 16px; border: 2px solid var(--ink); background: var(--paper); font: 15px 'Trebuchet MS', sans-serif; color: var(--ink); border-radius: 6px 3px 8px 4px; box-shadow: 3px 3px 0 var(--ink); transition: box-shadow .15s, transform .15s; outline: none; }
        .ea-field input:focus, .ea-field select:focus { box-shadow: 5px 5px 0 var(--blue); transform: translate(-1px, -1px); }
        .ea-field input::placeholder { color: #aaa; }
        .ea-field input:disabled, .ea-field select:disabled { opacity: .6; cursor: not-allowed; }
        .ea-submit { width: 100%; padding: 16px; font-size: 15px; justify-content: center; gap: 10px; }
        .ea-submit:disabled { opacity: .6; cursor: not-allowed; transform: none !important; }
        .ea-fine-print { font: 11px 'Courier New', monospace; color: #888; text-align: center; margin: 0; }
        .ea-error { font: 12px 'Courier New', monospace; color: var(--red); border: 1px dashed var(--red); padding: 10px; border-radius: 4px; }
        .ea-sidebar { display: flex; flex-direction: column; gap: 16px; }
        .ea-card { padding: 22px; border: 2px solid var(--ink); background: var(--yellow); border-radius: 6px 14px 4px 10px; box-shadow: 4px 4px 0 var(--ink); transition: transform .2s ease, box-shadow .2s ease; }
        .ea-card:hover { transform: translate(-2px, -2px) rotate(-1deg); box-shadow: 6px 6px 0 var(--ink); }
        .ea-card.purple { background: #ede9fe; }
        .ea-card.green { background: var(--green); }
        .ea-card.yellow { background: #fef9c3; }
        .ea-card-icon { display: block; margin-bottom: 12px; color: var(--ink); }
        .ea-card h3 { font-size: 17px; letter-spacing: -.03em; margin-bottom: 8px; }
        .ea-card p { font: 13px/1.5 'Courier New', monospace; color: #555; margin: 0; }
        @media (max-width: 720px) {
          .ea-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  )
}
