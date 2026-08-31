'use client'

import { ArrowRight, GitBranch, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
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

      <section className="shell max-w-3xl">
        <div className="section-heading">
          <span className="eyebrow">Legal</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-8 leading-tight tracking-tight">Privacy Policy</h1>
        </div>
        
        <div className="prose prose-lg text-[#444] font-sans leading-relaxed space-y-6">
          <p>
            At MYLO, we believe your screen is yours. Our core philosophy is built around <strong>local-first processing</strong> and absolute transparency. This Privacy Policy outlines what data we handle and how we protect your privacy when you use MYLO: Motion. Your Live Operator.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">1. Local Processing & Screen Capture</h2>
          <p>
            MYLO utilizes Windows Graphics Capture (WGC) to see your screen in real-time. <strong>No screenshots, video feeds, or screen captures are ever saved to your disk or sent to our servers.</strong> The data lives entirely in your computer's RAM (random-access memory) and is discarded immediately after analysis.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">2. Bring Your Own Key (BYOK) Model</h2>
          <p>
            If you are using the free BYOK version of MYLO, you connect your own API keys (e.g., Google Gemini or OpenAI). When you ask MYLO a question, your queries and the necessary context are transmitted <strong>directly</strong> from your local machine to the chosen provider's API. MYLO does not intercept, log, or route this data through our own servers. Your API key is stored securely in your operating system's native keychain.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">3. Exclusion Layer</h2>
          <p>
            MYLO is engineered using native OS features like <code>WDA_EXCLUDEFROMCAPTURE</code>. This means our overlays and UI elements are completely invisible to screen recording software like OBS, Discord, or Zoom. What you do with MYLO stays private to you.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">4. Telemetry and Analytics</h2>
          <p>
            We collect minimal, anonymized telemetry strictly for crash reporting and tracking which OS versions are running MYLO. We do not track your clicks, your queries, or the software you use.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or how your data is handled, please reach out to us at <a href="mailto:aryansharma24112003@gmail.com" className="text-[var(--blue)] underline">aryansharma24112003@gmail.com</a>.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t-2 border-[var(--ink)]">
          <Link href="/terms" className="ink-button inline-flex">
            Read Terms of Service <ArrowRight size={17} className="ml-2" />
          </Link>
        </div>
      </section>

      <footer className="footer shell mt-20">
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </div>
        <div className="footer-links">
          <a href="https://github.com/Aryan-Protein-Vala/MyloOS" target="_blank" rel="noopener noreferrer">GitHub <GitBranch size={15}/></a>
          <a href="mailto:aryansharma24112003@gmail.com">Contact Us <ArrowUpRight size={15}/></a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
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
