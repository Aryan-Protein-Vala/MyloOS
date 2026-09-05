'use client'

import { ArrowRight, GitBranch, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { PlatformStatus } from '@/components/platform-status'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pb-20">
      <nav className="nav shell mb-12">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </Link>
        <Link href="/" className="nav-back-link">← Back to Home</Link>
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
            MYLO uses Windows Graphics Capture on Windows and ScreenCaptureKit on macOS to read the region of your screen you select. <strong>No screenshots, video feeds, or screen captures are ever saved to your disk or sent to our servers.</strong> The data lives entirely in your computer's RAM (random-access memory) and is discarded immediately after analysis.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">2. Bring Your Own Key (BYOK) Model</h2>
          <p>
            If you are using the free BYOK version of MYLO, you connect your own API keys (e.g., Google Gemini or OpenAI). When you ask MYLO a question, your queries and the necessary context are transmitted <strong>directly</strong> from your local machine to the chosen provider's API. MYLO does not intercept, log, or route this data through our own servers. Your API key is stored in your operating system’s credential store — the Keychain on macOS, Credential Manager on Windows. It is never written to a file inside the application and never transmitted to us.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">3. Exclusion Layer</h2>
          <p>
            MYLO is engineered using native OS capture exclusion APIs — <code>WDA_EXCLUDEFROMCAPTURE</code> on Windows and <code>NSWindow.sharingType</code> on macOS. On Windows this requires version 2004 or newer; on older builds the exclusion is unavailable and MYLO tells you so in the overlay rather than claiming protection it does not have. When the exclusion is active, the overlay is absent from the capture buffer entirely, so OBS, Discord and Zoom cannot see it.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">4. Telemetry and Analytics</h2>
          <p>
            <strong>The MYLO desktop application collects no telemetry at all.</strong> It makes no network requests other than the ones you trigger, directly to the model provider whose key you supplied. It has no crash reporter and no analytics.<br/><br/>This website (myloos.com) uses Vercel Analytics, which records anonymous, aggregated page views. It sets no cookies and does not track you across sites. It runs only on the website, never in the desktop app.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">5. Who Controls Your Data</h2>
          <p>
            MYLO is an independent, MIT-licensed project maintained by Aryan Sharma, based in
            Gurugram, Haryana, India, who acts as the data controller for this website. We operate no
            servers that receive your queries, your screen contents, or your API keys, so the only
            personal data we hold is what you send us by email and the anonymous, aggregated page
            views described above. You can ask us what we hold, or ask us to delete it, at the
            address below.
          </p>

          <p>
            When you use your own API key, the provider you chose &mdash; Google or OpenAI &mdash;
            becomes an independent controller of whatever you send them, under their own privacy
            policy. We are not a party to that exchange.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">6. Contact Us</h2>
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
        <PlatformStatus/>
        <p className="copyright">© 2026 MYLO. Made for curious humans.</p>
      </footer>
    </main>
  )
}
