<div align="center">
  <img src="mylo%20frontend/public/icon.svg" alt="MYLO logo" width="120" height="120" />
  <h1>MYLO — Motion. Your Live Operator.</h1>
  <p><strong>An ambient, screen-aware AI agent that lives on top of your desktop.</strong></p>
</div>

<p align="center">
  <a href="#what-mylo-is">What it is</a> •
  <a href="#project-status">Status</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#running-it-locally">Running it locally</a> •
  <a href="#security-model">Security model</a>
</p>

---

## What MYLO is

MYLO is a desktop agent that reads the part of your screen you point it at, sends
that region to a model you supply the key for, and draws its answer back on top of
your screen in a transparent overlay window. It is not a sidebar chatbot: the
overlay sits above whatever app you are already in, and — where the OS supports it
— is invisible to screen recorders.

Three modes share one overlay:

| Mode | What it does | Can it move your mouse? |
| --- | --- | --- |
| **Ask** | Answers a question about the region you selected. | No |
| **Coach** | Draws an arrow and a tooltip over the control you should click next. | No — the overlay stays click-through the whole time. |
| **Do** | Proposes a single click, keystroke, or scroll and executes it after you approve. | Yes, but only through an explicit approval gate. See [Security model](#security-model). |

## Project status

**Pre-release, on both platforms.** There is no signed installer, nothing in the
Microsoft Store, and no download page. Windows and macOS support both live in this
repository and both can be built from source today. Linux is not started.

Things that are deliberately not built yet: any billing or subscription, hosted
model access ("Pro"), auto-update, crash reporting.

## Architecture

A monorepo with two independent applications.

```
MyloOS/
├── mylo frontend/          Marketing site (Next.js 16, deployed to Vercel)
└── mylo-app/               The desktop app
    ├── app/                Next.js, statically exported to ../out
    │   ├── (dashboard)/    Settings window — opaque, its own root layout
    │   └── (overlay)/      HUD window     — transparent, its own root layout
    ├── lib/ai-client.ts    Provider selection, prompting, response parsing
    └── src-tauri/          The Rust core
        ├── ipc.rs              Every command the webview can call
        ├── screen_capture.rs   WGC (Windows) / ScreenCaptureKit via xcap (macOS)
        ├── input_injector.rs   Synthetic mouse and keyboard, via enigo
        ├── storage.rs          API keys, in the OS credential store
        ├── hotkey.rs           Global shortcuts, incl. the panic key
        ├── state.rs            Overlay mode + the Do Mode approval guard
        └── platform_macos.rs   NSWindow sharing type, level, Spaces behaviour
```

### Two root layouts, on purpose

The dashboard and the overlay are separate windows with opposite requirements: the
dashboard needs an opaque background, the overlay must be fully transparent. Next's
App Router emits one CSS chunk per root layout, so the two routes are in separate
**route groups** with **separate root layouts**. If they shared one, the dashboard's
opaque `html` background would leak into the overlay and black out the user's whole
screen. CI asserts this stays true by grepping the emitted overlay stylesheet.

### The coordinate contract

Getting this wrong means MYLO clicks the wrong thing, so it is written down once and
enforced everywhere:

- `screen_capture` and `input_injector` speak **global desktop physical pixels**, always.
- The only place logical pixels are converted to physical is `ipc::to_global_rect`,
  which uses the window's `outer_position()` and `scale_factor()`. Browser
  `devicePixelRatio` is never trusted for this.
- `capture_screen_crop` returns the rectangle it actually captured. The model replies
  with ratios in `[0, 1]` relative to that image; the frontend maps those back to
  global physical pixels; Rust then re-validates the result against the real desktop
  bounds before touching the mouse.

## Running it locally

### Prerequisites

- Node.js 22+
- Rust 1.77+ (stable) and Cargo
- **Windows:** Windows 10 version 2004 or newer, plus the WebView2 runtime and
  the MSVC build tools.
- **macOS:** Xcode command line tools. On first run, grant **Screen Recording** and
  **Accessibility** permission in System Settings → Privacy & Security; the app
  cannot capture or click without both.

### The desktop app

```bash
cd mylo-app
npm install
npm run tauri dev
```

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # static export into ./out
npm run tauri build # a real bundle (unsigned)
```

### The marketing site

```bash
cd "mylo frontend"
pnpm install
pnpm dev
```

## Security model

MYLO can see your screen and move your mouse, so the constraints matter more than
the features.

**Keys.** Your API key goes into the OS credential store — Keychain on macOS,
Credential Manager on Windows — via the `keyring` crate. It is never written to a
config file and never leaves your machine except in the request to the provider you
chose.

**Capture.** Nothing is written to disk. A capture is encoded to JPEG in memory,
sent to the provider, and dropped. Capture only happens on an explicit user action.

**Do Mode is gated in Rust, not in the UI.** `execute_do_action` refuses to run
unless `approve_do_action` has armed a single-use guard with the exact action, and
it refuses outright while the overlay is still visible. Approving hides the overlay,
waits for it to settle, and only then injects. A UI bug cannot skip the gate,
because the gate is not in the UI.

**Panic key.** A global shortcut hides the overlay, cancels any armed action, and
releases input, whether or not MYLO has focus.

**Overlay privacy, honestly.** On Windows the overlay is excluded from capture with
`WDA_EXCLUDEFROMCAPTURE`, which requires Windows 10 2004+. On macOS it uses
`NSWindowSharingNone`. Where the exclusion cannot be applied, MYLO reports that
rather than implying protection it does not have.

**Telemetry.** The desktop app has none. No analytics, no crash reporter, no
network traffic other than the requests you trigger. (The *website* uses Vercel
Analytics; that is disclosed in the privacy policy and runs only on the website.)

## Continuous integration

`.github/workflows/ci.yml` runs on every push:

- typecheck and static-export the desktop app's web layer, then assert both
  `out/index.html` and `out/overlay/index.html` exist and the overlay's stylesheet
  contains no opaque background;
- `cargo clippy` and `cargo test` for the Rust core on **both** `windows-latest` and
  `macos-latest`, because the capture backends are mutually exclusive and neither
  can be validated on the other's runner;
- typecheck and build the marketing site.

## Contributing

Issues and pull requests are welcome. Please keep the coordinate contract and the
Do Mode approval gate intact — if a change makes it possible to inject input without
passing `approve_do_action`, it will not be merged.

## Licence

MIT. See [LICENSE](LICENSE).

## Contact

[aryansharma24112003@gmail.com](mailto:aryansharma24112003@gmail.com)

---
<div align="center"><i>Made for curious humans.</i></div>
