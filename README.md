<div align="center">
  <img src="https://raw.githubusercontent.com/Aryan-Protein-Vala/MyloOS/main/mylo%20frontend/public/icon.svg" alt="MYLO OS Logo" width="120" height="120" />
  <h1>MYLO : Motion. Your Live Operator.</h1>
  <p><strong>The closest thing to Iron Man's Jarvis. An AI that actually runs your... well, everything.</strong></p>
</div>

<p align="center">
  <a href="https://mylo-frontend.vercel.app">Website</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#pricing--tiers">Pricing</a>
</p>

---

## ✳️ What is MYLO?

Hold a hotkey, say the task out loud. MYLO hijacks your screen with a ghost cursor and just… does it. Powered by **Cortex**, it remembers everything—your projects, your preferences, your chaos. No corporate fluff. Just an AI that actually works.

Unlike standard sidebar chatbots, MYLO overlays its interface transparently over your active applications (like Blender, Excel, or your terminal) using native Windows Graphics Capture (WGC) and macOS Core Graphics. 

It's the AI that lives on your screen, sees what you see, and operates your OS like a human would.

## 🚀 The Ridiculous Superpowers

### 1. OS Takeover (YOINK)
Speak the task, step back, and watch the ghost cursor hijack your IDE, browser, or video editor and actually do the grunt work. No screenshots. No hallucinations. Just results.

### 2. The Cortex Memory Layer
An AI that actually knows you. Your messy code, your weird project names, that chat you had three days ago—remembered. It runs on an Ebbinghaus decay curve to forget the junk and remember what actually matters. Every session gets smarter. 

### 3. Background Agents (Orchestrator)
Because you have a life. Tell MYLO to scrape 200 competitors, post your content, market for you, or pull leads. It spins up a headless Chrome instance and handles it quietly in the background, pinging you when done.

### 4. Stealth Mode
Invisible to everyone *but you*. Your Zoom call is live. Your stream is running. MYLO's overlay exists nowhere except your eyeballs. We use `WDA_EXCLUDEFROMCAPTURE` on Windows and `NSWindow.sharingType` on macOS—actual OS-level pixel exclusion. Nothing hits disk, and your audience sees nothing.

## 🏗️ Architecture

MYLO consists of three primary components housed in this monorepo:

1. **`mylo frontend/`** - The Marketing Site
   - Built with Next.js 14, React, and TailwindCSS.
   - Deployed seamlessly to Vercel.
2. **`mylo-app/`** - The Tauri Desktop App
   - Built with Tauri 2.0 and Rust.
   - **Zero Latency Capture:** Uses WGC & Core Graphics.
   - **Lightweight:** Uses ~35MB RAM, doesn't ruin your framerate.
   - Utilizes custom Rust plugins for Global Shortcuts (`hotkey.rs`), Screen Capture (`screen_capture.rs`), Input Injection (`input_injector.rs`), and secure credential storage (`storage.rs`).
3. **`mylo-proxy/`** - The Cloudflare Edge Proxy
   - Secure serverless routing for our Managed Tiers (Pro/Elite).
   - Validates License Keys at the edge and safely injects Anthropic Master API keys to prevent client-side key theft.

## 💳 Pricing & Tiers

Your keys or ours. Either way.

- **Free (BYOK):** 100% private. Bring your own Gemini or OpenAI API keys. Full GUI takeover, voice, and ghost clicks.
- **Pro ($14.99/mo):** Cortex switched on. Token budget included. Powered strictly by Claude Sonnet 4.5 & Haiku 4.5 (because we aren't savages).
- **Elite ($49.99/mo):** Unlimited Cortex memory, Background Agent spawning, and future frontier models.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (1.77+)
- Cargo
- `npm` or `pnpm`
- Cloudflare Wrangler (for proxy development)

### Local Development

**1. Clone the repository**
```bash
git clone https://github.com/Aryan-Protein-Vala/MyloOS.git
cd MyloOS
```

**2. Run the Marketing Site**
```bash
cd "mylo frontend"
npm install
npm run dev
```

**3. Run the Cloud Proxy (Managed Routing)**
```bash
cd mylo-proxy
npm install
npx wrangler dev
```

**4. Run the Tauri Desktop App**
```bash
cd mylo-app
npm install
npm run tauri dev
```

## 🔒 Privacy & Legal

We take privacy seriously. Please review our [Privacy Policy](https://mylo-frontend.vercel.app/privacy) and [Terms of Service](https://mylo-frontend.vercel.app/terms) for detailed information on how MYLO operates securely.

## ✉️ Contact

For support, questions, or feedback, please contact: [aryansharma24112003@gmail.com](mailto:aryansharma24112003@gmail.com).

---
<div align="center">
  <i>Made for curious humans.</i>
</div>
