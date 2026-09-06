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
          <span className="eyebrow">Get in touch</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-8 leading-tight tracking-tight">Contact Us</h1>
          <p className="text-[#444] text-lg">Have a question, feedback, or need support? Drop us a message below.</p>
        </div>
        
        <form 
          action="https://formsubmit.co/aryansharma24112003@gmail.com" 
          method="POST" 
          className="bg-white border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink)] rounded-xl p-8 space-y-6 mt-8"
        >
          {/* FormSubmit Configuration */}
          <input type="hidden" name="_next" value="https://mylo-frontend.vercel.app/contact/success" />
          <input type="hidden" name="_subject" value="New MYLO Contact Form Submission!" />
          <input type="hidden" name="_captcha" value="false" />

          <div>
            <label htmlFor="name" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Name</label>
            <input 
              type="text" 
              name="name" 
              id="name" 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="Sharma ji's elder son (or pupkin sharma)"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Your Email</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all"
              placeholder="topper_sharma@iitb.edu.in"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-bold font-mono text-[var(--ink)] mb-2 uppercase">Message</label>
            <textarea 
              name="message" 
              id="message" 
              rows={5} 
              required 
              className="w-full border-2 border-[var(--ink)] rounded-md px-4 py-3 bg-[var(--paper)] focus:outline-none focus:ring-4 focus:ring-[var(--blue)] focus:border-transparent transition-all resize-y"
              placeholder="Bro my code is broken, pls help..."
            ></textarea>
          </div>

          <button type="submit" className="ink-button w-full mt-4 !py-4 text-lg">
            Send Message <ArrowRight size={19} className="ml-2" />
          </button>
        </form>
      </section>

      <footer className="footer shell mt-20">
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </div>
        <div className="footer-links">
          <a href="https://github.com/Aryan-Protein-Vala/MyloOS" target="_blank" rel="noopener noreferrer">GitHub <GitBranch size={15}/></a>
          <Link href="/contact">Contact Us <ArrowUpRight size={15}/></Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <div className="platforms">
          <span><i className="live"/> Windows: LIVE</span>
          <span><i/> macOS: IN PROGRESS</span>
        </div>
        <p className="copyright">© 2026 MYLO. Made for curious humans.</p>
      </footer>
    </main>
  )
}
