'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, CircleDot, Sparkles, MousePointer2, EyeOff, Key } from 'lucide-react'
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
        <div className="ea-badge">
          <CircleDot size={13}/> V1 EARLY ACCESS <span>•</span> Limited Spots
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
                placeholder="Your name (not 'anonymous123')"
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
                placeholder="Your best email — we&apos;ll actually use it"
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
                <option value="developer">Developer / Engineer</option>
                <option value="designer">Designer / Creative</option>
                <option value="founder">Founder / Building something</option>
                <option value="student">Student (respect)</option>
                <option value="streamer">Streamer / Content Creator</option>
                <option value="pm">Product Manager</option>
                <option value="other">Something else entirely</option>
              </select>
            </div>

            {error && <p className="ea-error">{error}</p>}

            <button type="submit" className="ink-button ea-submit" disabled={submitting}>
              {submitting ? 'Sending you in…' : <><Sparkles size={16}/> Lock In My Spot <ArrowRight size={16}/></>}
            </button>

            <p className="ea-fine-print">
              No spam. No &quot;synergy&quot;. No corporate newsletter. Just an email when your access is ready.
            </p>
          </form>

          <div className="ea-sidebar">
            <div className="ea-card">
              <span className="ea-card-icon"><MousePointer2 size={26} strokeWidth={1.5} /></span>
              <h3>Ghost Cursor Mode</h3>
              <p>MYLO takes control of your mouse and keyboard to run tasks across any app. You watch. It works.</p>
            </div>
            <div className="ea-card purple">
              <span className="ea-card-icon"><Sparkles size={26} strokeWidth={1.5} /></span>
              <h3>Cortex Memory</h3>
              <p>Remembers your projects, preferences, and past chats. Every AI you use shares the same brain — yours.</p>
            </div>
            <div className="ea-card green">
              <span className="ea-card-icon"><EyeOff size={26} strokeWidth={1.5} /></span>
              <h3>Stealth Overlay</h3>
              <p>OS-level pixel exclusion. Your Zoom call sees nothing. You see everything. It&apos;s not magic, it&apos;s Rust.</p>
            </div>
            <div className="ea-card yellow">
              <span className="ea-card-icon"><Key size={26} strokeWidth={1.5} /></span>
              <h3>BYOK — Bring Your Own Key</h3>
              <p>Free tier = your own API keys, zero markup. We connect directly. You pay the API. We charge nothing.</p>
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
