'use client'

import { useEffect } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmedPage() {
  // Auto-redirect back to home after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = '/'
    }, 6000)
    return () => clearTimeout(t)
  }, [])

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', background: 'var(--paper)' }}>
      <div style={{ maxWidth: '580px', width: '100%' }}>
        <div style={{ display: 'inline-grid', placeItems: 'center', width: '72px', height: '72px', background: 'var(--green)', border: '3px solid var(--ink)', borderRadius: '50%', fontSize: '36px', marginBottom: '28px', boxShadow: '5px 5px 0 var(--ink)' }}>
          <Check size={36} strokeWidth={3}/>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', background: 'var(--yellow)', border: '2px solid var(--ink)', borderRadius: '40px', font: 'bold 11px Courier New, monospace', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '24px' }}>
          ✳ You&apos;re In!
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', lineHeight: '1', letterSpacing: '-.065em', marginBottom: '20px' }}>
          Spot locked.<br/>
          <em style={{ fontStyle: 'normal', textDecoration: 'underline wavy var(--blue) 3px', textDecorationSkipInk: 'none' }}>Welcome to the cult.</em>
        </h1>

        <p style={{ fontSize: '17px', lineHeight: '1.6', color: '#555', marginBottom: '10px', fontFamily: 'Trebuchet MS, sans-serif' }}>
          We&apos;ve got your email. You&apos;ll hear from us when your V1 Early Access slot opens — no spammy newsletters, no &quot;exciting announcements&quot;. Just the real thing.
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#888', marginBottom: '36px', fontFamily: 'Courier New, monospace' }}>
          Check your inbox — we just sent a confirmation. And yes, it&apos;s actually worth reading.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
          <Link href="/" className="ink-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Back to MYLO <ArrowRight size={16}/>
          </Link>
          <a href="https://twitter.com/intent/tweet?text=Just+got+early+access+to+MYLO+—+the+AI+that+literally+takes+over+your+computer+%F0%9F%91%BB+%40heymylo" target="_blank" rel="noopener noreferrer" className="paper-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Brag on Twitter <ArrowRight size={16}/>
          </a>
        </div>

        <p style={{ font: '11px Courier New, monospace', color: '#bbb' }}>
          Auto-redirecting you back in 6 seconds…
        </p>
      </div>
    </main>
  )
}
