'use client'

import { useState } from 'react'
import { ArrowRight, GitBranch, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: `🚨 New MYLO Contact Form Submission from ${name}`,
          _template: 'table',
        }),
      })
      if (res.ok) {
        window.location.href = '/contact/success'
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
    <main className="min-h-screen pb-20">
      <nav className="nav shell mb-12">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </Link>
        <Link href="/" className="nav-back-link">← Back to Home</Link>
      </nav>

      <section className="shell max-w-2xl">
        <div className="section-heading">
          <span className="eyebrow">Get in touch <span className="lowercase normal-case font-normal">(not like that)</span></span>
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-8 leading-tight tracking-tight">Contact Us</h1>
          <p className="text-[#444] text-lg">Found a bug? Want to yell at us? Need someone to talk to at 3 AM? Drop a message below, we read everything.</p>
        </div>
        
        <form 
          onSubmit={handleSubmit}
          className="bg-white border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink)] rounded-xl p-8 space-y-6 mt-8"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Name</label>
            <input 
              type="text" 
              id="name" 
              value={name}
              onChange={e => setName(e.target.value)}
              required 
              disabled={submitting}
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="Sharma ji's elder son"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
              disabled={submitting}
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="topper_sharma@iitb.edu.in"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Message</label>
            <textarea 
              id="message" 
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5} 
              required 
              disabled={submitting}
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all resize-y"
              placeholder="Bro my code is broken, pls help..."
            ></textarea>
          </div>

          {error && <p className="text-red-500 font-mono text-sm mt-2">{error}</p>}

          <button type="submit" className="ink-button w-full mt-4 !py-4 text-lg" disabled={submitting}>
            {submitting ? 'Sending...' : <><span className="mr-2">Send Message</span> <ArrowRight size={19} /></>}
          </button>
        </form>
      </section>

      <footer className="footer shell mt-20">
        <div className="brand"><span className="brand-mark">✳</span><span><strong>MYLO</strong><small>[os-native agent]</small></span></div>
        <div className="footer-links">
          <a href="https://github.com/Aryan-Protein-Vala/MyloOS" target="_blank" rel="noopener noreferrer">GitHub <GitBranch size={15} /></a>
          <Link href="/contact">Contact Us <ArrowUpRight size={15} /></Link>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
        </div>
        <div className="platforms"><span><i className="live" /> Windows: EARLY ACCESS</span><span><i className="live" /> macOS: EARLY ACCESS</span></div>
        <p className="copyright">© 2026 MYLO. Built by people who actually use their own product.</p>
      </footer>
    </main>
  )
}
