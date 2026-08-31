<div align="center">
  <img src="https://raw.githubusercontent.com/Aryan-Protein-Vala/MyloOS/main/mylo%20frontend/public/icon.svg" alt="MYLO OS Logo" width="120" height="120" />
  <h1>MYLO : Motion. Your Live Operator.</h1>
  <p><strong>The AI that moves with you.</strong></p>
</div>

<p align="center">
  <a href="https://mylo-frontend.vercel.app">Website</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## ✳️ What is MYLO?

MYLO is an OS-native, ambient AI desktop agent designed to coach, act, and answer without breaking your flow. Unlike standard sidebar chatbots, MYLO overlays its interface transparently over your active applications (like Blender, Excel, or your terminal) using native Windows Graphics Capture (WGC).

It's the AI that lives on your screen, sees what you see, and teaches you like a game.

## 🚀 Features

- **Wobbly, Sketchy Aesthetic:** A beautiful, hand-drawn visual identity using `rough.js` that feels like a warm notebook overlaid on your complex workflows.
- **Three Modes of Operation:**
  - **Coach Mode:** Overlays contextual arrows and tooltips directly over the buttons you need to click in your active application.
  - **Do Mode:** Simulates ghost cursors to perform repetitive tasks, always asking for your approval first.
  - **Ask Mode:** A quick context-aware dialogue overlay for rapid problem-solving.
- **100% Privacy Focused:** No screenshots are ever saved to disk or uploaded to our servers. Everything is processed locally in RAM.
- **Bring Your Own Key (BYOK):** Use your own Google Gemini, OpenAI, or Claude API keys. 

## 🏗️ Architecture

MYLO consists of two primary parts housed in this monorepo:

1. **`mylo frontend/`** - The Marketing Site
   - Built with Next.js 14, React, and TailwindCSS.
   - Deployed seamlessly to Vercel.
2. **`mylo-app/`** - The Tauri Desktop App
   - Built with Tauri 2.0 and Rust.
   - Utilizes custom Rust plugins for Global Shortcuts (`hotkey.rs`), Screen Capture (`screen_capture.rs`), Input Injection (`input_injector.rs`), and secure credential storage (`storage.rs`).
   - Employs a multi-window architecture: a main dashboard window and a transparent, click-through overlay window for HUD elements.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (1.77+)
- Cargo
- `npm` or `pnpm`

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

**3. Run the Tauri Desktop App**
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
