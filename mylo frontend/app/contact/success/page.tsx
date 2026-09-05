'use client'

import { ArrowRight, GitBranch, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { PlatformStatus } from '@/components/platform-status'

export default function ContactSuccessPage() {
  return (
    <main className="min-h-screen pb-20">
      <nav className="nav shell mb-12">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </Link>
        <div className="nav-links">
          <Link href="/">Back to Home</Link>
        </div>
      </nav>

      <section className="shell max-w-2xl text-center py-20">
        <div className="inline-flex justify-center items-center w-20 h-20 bg-[var(--yellow)] border-2 border-[var(--ink)] rounded-full mb-8 shadow-[4px_4px_0_var(--ink)]">
          <CheckCircle2 size={40} className="text-[var(--green)]" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">Message Received!</h1>
        <p className="text-lg text-[#444] mb-12">
          Thanks for reaching out to MYLO. We've got your message and will get back to you as soon as possible.
        </p>

        <Link href="/" className="ink-button inline-flex">
          Return to Home <ArrowRight size={17} className="ml-2" />
        </Link>
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
        <PlatformStatus/>
        <p className="copyright">© 2026 MYLO. Made for curious humans.</p>
      </footer>
    </main>
  )
}
