'use client'

import { ArrowRight, GitBranch, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-8 leading-tight tracking-tight">Terms of Service</h1>
        </div>
        
        <div className="prose prose-lg text-[#444] font-sans leading-relaxed space-y-6">
          <p>
            Welcome to MYLO: Motion. Your Live Operator. By downloading, accessing, or using the MYLO software and website, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">1. License and Usage</h2>
          <p>
            MYLO grants you a personal, non-exclusive, non-transferable license to use the MYLO software on your personal devices. You may not distribute, reverse engineer, decompile, or modify the software without our explicit permission.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">2. Bring Your Own Key (BYOK) Responsibility</h2>
          <p>
            If you utilize the BYOK tier, you are solely responsible for acquiring, managing, and securing your own API keys (e.g., from OpenAI or Google). MYLO is not responsible for any usage limits, costs, or API bans incurred by your provider through your use of the software. You agree to abide by the terms and conditions of your chosen API provider.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">3. Assumption of Risk ("Do Mode")</h2>
          <p>
            MYLO includes features like "Do Mode" that allow the AI to simulate mouse movements and keyboard inputs on your behalf. <strong>You are fully responsible for the actions MYLO takes on your computer.</strong> MYLO is designed to pause for your approval before executing actions, but you assume all risks associated with automated software control. We are not liable for any data loss, unintended actions, or system changes caused by MYLO.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">4. Acceptable Use &amp; Prohibited Conduct</h2>
          <p>
            MYLO is designed to boost your productivity through legitimate workflows. <strong>You agree NOT to use MYLO to:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Cheat on exams, assessments, or any form of academic evaluation.</li>
            <li>Circumvent, bypass, or interfere with proctoring software, anti-cheat systems, or any monitoring tools deployed by educational institutions, employers, or testing organizations.</li>
            <li>Violate the terms of service, codes of conduct, or policies of any institution, employer, platform, or third-party service.</li>
            <li>Engage in any activity that is illegal, deceptive, fraudulent, or harmful to others.</li>
            <li>Misrepresent MYLO&apos;s output as your own original work in contexts where AI assistance is prohibited.</li>
          </ul>
          <p className="mt-4">
            MYLO&apos;s overlay exclusion feature (<code>WDA_EXCLUDEFROMCAPTURE</code> on Windows / <code>NSWindow.sharingType</code> on macOS) is an OS-native capability provided for <strong>privacy, streaming, and productivity purposes only</strong>. You are solely responsible for ensuring your use of MYLO complies with all applicable laws, regulations, institutional policies, and contractual obligations. We reserve the right to suspend or terminate your access if we become aware of prohibited use.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">5. No Warranties</h2>
          <p>
            MYLO is provided &quot;as is&quot; and &quot;as available,&quot; without any warranties of any kind, whether express or implied. We do not guarantee that the software will be error-free or uninterrupted.
          </p>

          <h2 className="text-2xl font-bold text-[#1e1e1e] mt-10">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, MYLO and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. This includes, without limitation, any damages arising from misuse of MYLO&apos;s overlay, stealth, or automation features.
          </p>

          <p className="mt-8">
            Last updated: August 2026<br/>
            Contact: <a href="mailto:aryansharma24112003@gmail.com" className="text-[var(--blue)] underline">aryansharma24112003@gmail.com</a>
          </p>
        </div>

        <div className="mt-16 pt-8 border-t-2 border-[var(--ink)]">
          <Link href="/privacy" className="paper-button inline-flex">
            Read Privacy Policy <ArrowRight size={17} className="ml-2" />
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
