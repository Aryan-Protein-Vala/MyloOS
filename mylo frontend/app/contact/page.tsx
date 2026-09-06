'use client'

import { ArrowRight, GitBranch, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
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
          action="https://formsubmit.co/aryansharma24112003@gmail.com" 
          method="POST"
          className="bg-white border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink)] rounded-xl p-8 space-y-6 mt-8"
        >
          {/* FormSubmit Configuration */}
          <input type="hidden" name="_subject" value="New MYLO Contact Form Submission!" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="box" />
          <input type="hidden" name="_next" value="https://heymylo.vercel.app/contact/success" />

          <div>
            <label htmlFor="name" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="Sharma ji's elder son"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="topper_sharma@iitb.edu.in"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Message</label>
            <textarea 
              id="message" 
              name="message" 
              rows={5} 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all resize-y"
              placeholder="Bro my code is broken, pls help..."
            ></textarea>
          </div>

          <button type="submit" className="ink-button w-full mt-4 !py-4 text-lg">
            Send Message <ArrowRight size={19} className="ml-2 inline" />
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
