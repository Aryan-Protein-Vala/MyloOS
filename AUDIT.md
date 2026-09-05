# MYLO — Full Codebase & Flow Audit
**Date:** 2026-09-05 · **Commit audited:** `6d7e366` (`feat: complete macOS support and background daemon`)
**Scope:** `mylo-app/` (Tauri 2 + Next 16 desktop app, Windows + macOS paths), `mylo frontend/` (Next 16 marketing site), repo hygiene, legal/marketing accuracy.

> **⚠️ This document is historical.** It records findings as of `6d7e366`. Most have since been fixed — see **[FIXES.md](FIXES.md)** for the current scoreboard.


---

## 0. TL;DR — the honest state of the project

| Area | Reality |
|---|---|
| Windows desktop build | ❌ **Does not compile.** `screen_capture.rs` is written against a `windows-capture` API that does not exist in the version `Cargo.lock` resolves (1.5.0). 3 separate hard compile errors. |
| macOS desktop build | ⚠️ Compiles (evidenced by `check_out.txt`), but **`tauri build` fails at config validation** (`productName` + `identifier`), and at runtime the overlay is **opaque, un-clickable, and mouse-dead**. |
| Overlay (both OS) | ❌ **Renders as a solid cream-coloured full-screen sheet with grid lines over your entire desktop.** Verified by building the app and reading the emitted CSS. |
| Global hotkeys | ❌ **Both hotkeys fire twice per press** (Pressed + Released), so every press shows-then-instantly-hides the overlay. Net effect: nothing happens. |
| Do Mode | ❌ Coordinates returned by the AI are meaningless in screen space; the approval card is un-clickable; the injected click lands on MYLO's own overlay. |
| Ask Mode | ⚠️ Only works on the primary monitor, only with a Gemini key, and the answer card's "Clear selection" button can't be clicked. |
| Coach Mode | ❌ Dead code. Nothing ever activates it. It is the #1 feature on the marketing site. |
| Voice / "Listening…" | ❌ Does not exist anywhere in the codebase. Advertised in-app and on the site. |
| API key storage | ❌ Plaintext JSON on disk. App says "encrypted local store"; Privacy Policy says "OS native keychain". |
| Marketing site claims | ❌ "Windows: LIVE", "v0.9 Beta", "MSIX, Microsoft Store approved", "0.02s capture latency", "~35MB RAM", "$15/mo Pro" — none are backed by anything in this repo, and there is **no download link anywhere on the site**. |

**Bottom line:** the architecture and the taste are genuinely good. The problem is that no end-to-end flow has ever run on either OS. Everything below is fixable, and most of it is fixable in about two focused weeks.

---

## 1. 🔴 BLOCKERS — nothing ships until these are fixed

### B1. `productName` contains `:` → Tauri config validation fails on every platform
`mylo-app/src-tauri/tauri.conf.json:3`
```json
"productName": "MYLO: Motion. Your Live Operator."
```
Tauri's config schema enforces `productName` matches `^[^/\\:*?"<>|]+$` (these are illegal Windows filename characters; the product name becomes the `.exe`, the install dir, the Start-Menu folder, the `HKCU\Software\<publisher>\<product>` key, the `.app` and the `.dmg`).
**Effect:** `tauri build` errors out. The `.` at the end is also bad — Windows silently strips trailing dots from directory names.
**Fix:** `"productName": "MYLO"` + `"mainBinaryName": "MYLO"`, and put the tagline in the window `title` only.

### B2. `identifier` is still the Tauri default → `tauri build` refuses to run
`tauri.conf.json:5` → `"identifier": "com.tauri.dev"`
Tauri hard-errors: *"You must change the bundle identifier… The default value `com.tauri.dev` is not allowed."*
This is also **the identity macOS TCC uses to remember Screen Recording + Accessibility grants** and the key for the app-data dir where the API keys live. Shipping under `com.tauri.dev` means colliding with every other lazy Tauri app on the machine.
**Fix:** `com.mylo.desktop` (or your real reverse-domain). Note the Microsoft Store rule: publisher name must not equal product name — set `bundle.publisher` explicitly.

### B3. Windows screen capture does not compile — 3 errors
`mylo-app/src-tauri/src/screen_capture.rs`. `Cargo.toml` declares `windows-capture = "1.1.26"` which is `^1.1.26` → **`Cargo.lock` resolved 1.5.0**. The code targets the 1.1 API.

| Line | Code | Reality in 1.5.0 |
|---|---|---|
| 136 | `windows_capture::capture::GraphicsCaptureApi::start::<CaptureHandler>(settings)` | No such type in `capture`. The module exports only `CaptureControl`, `Context`, the error enums and the `GraphicsCaptureApiHandler` trait. The correct call is `CaptureHandler::start(settings)` (or `start_free_threaded`). |
| 109 | `fn on_closed(&mut self, _cc: InternalCaptureControl)` | Trait signature is `fn on_closed(&mut self)` — no argument. Signature mismatch = compile error. |
| 128-134 | `Settings::new(item, cursor, border, color_format, flags)` — 5 args | 1.5.0 takes **8**: `(item, cursor_capture, draw_border, secondary_window, minimum_update_interval, dirty_region, color_format, flags)`. |

**Effect:** `cargo build` on Windows fails. Combined with the marketing site saying "Windows: LIVE", this is the single most dangerous gap in the project.
**Fix:** pin exactly (`windows-capture = "=1.5.0"`) and rewrite against the 1.5 API, or pin `"=1.1.26"` and keep the current code. Pin **all** native crates with `=` — `xcap`, `enigo`, `windows`, `image`. Caret ranges on OS-level crates are how you get "it compiled last month".

### B4. The overlay is an opaque sheet over the user's whole screen
`mylo-app/app/layout.tsx` is the root layout for `/overlay` too, and it imports `app/globals.css`, which contains the **entire marketing-site stylesheet**, including:
```css
body { background: var(--paper); background-image: linear-gradient(...); background-size: 22px 22px; }
html { background: var(--background); }
```
*Verified empirically:* I ran `next build` on `mylo-app`; `out/overlay.html` loads `_next/static/chunks/3qmkva07cp1ue.css`, which contains exactly that `body{background:var(--paper)…}` rule. The window is `transparent: true`, but the web content paints a solid `#faf8f5` page with grid lines edge to edge.
**Effect:** press the hotkey → your entire desktop is covered by a cream notepad. Everything else about the overlay is moot until this is fixed.
**Fix:** overlay needs its own route-group layout (or `html,body { background: transparent !important; }` scoped to `/overlay`), and the overlay must not inherit the marketing CSS at all.

### B5. macOS transparent windows require `macOSPrivateApi: true`
`tauri.conf.json` has no `app.macOSPrivateApi`. Tauri documents this as required for `transparent: true` on macOS. Without it the overlay is opaque even after B4 is fixed.
⚠️ **Also note:** enabling it means Apple **will reject the app from the Mac App Store**. Direct distribution (notarized DMG) only. Decide this now, because your pricing page implies a Mac product.

### B6. Both global hotkeys are no-ops (fire twice per keypress)
`mylo-app/src-tauri/src/hotkey.rs:20, 38`
```rust
app.global_shortcut().on_shortcut(ask_shortcut, move |_app, _shortcut, _event| { … })
```
`_event` is ignored. `tauri-plugin-global-shortcut` invokes the handler for **both `ShortcutState::Pressed` and `ShortcutState::Released`** (long-standing, well-documented behaviour). Your handler toggles state, so one physical keypress = show + hide.
**Effect:** Alt+Space and Alt+Shift+S visibly do nothing.
**Fix:** `if event.state() != ShortcutState::Pressed { return; }`.

### B7. `@tauri-apps/cli` is not installed
`mylo-app/package.json` has the script `"tauri": "tauri"` but no `@tauri-apps/cli` in `devDependencies`. `npm run tauri dev` — the exact command in your README — fails with "tauri: not found" on a fresh clone.

---

## 2. 🔴 Broken core flows (logic, not config)

### F1. macOS overlay can never receive a single mouse event
`platform_macos.rs:33` sets `setIgnoresMouseEvents: true` at startup — and **nothing ever sets it back to false**. `set_overlay_interactive()` on macOS (`ipc.rs:33`) only calls `reassert_stream_safety()`; the `interactive` argument is literally discarded with `let _ = interactive;`.
**Effect:** on macOS you cannot draw an Ask selection, cannot type an intent, cannot click Approve. The entire macOS app is a decorative window. The commit message says "complete macOS support".

### F2. CSS `pointer-events` cannot override OS-level click-through (Windows *and* macOS)
This is a conceptual error that breaks Ask **and** Do on both platforms. `app/overlay/page.tsx:177-179`:
```ts
await invoke('set_overlay_interactive', { interactive: false })
// Re-enable pointer events for the intent card only (it's pointer-events-auto)
setTimeout(() => intentInputRef.current?.focus(), 100)
```
Once `WS_EX_TRANSPARENT` is set (Win) / `ignoresMouseEvents` is set (mac), the **window is removed from hit-testing at the OS compositor level**. No CSS class inside the webview can bring it back. So:
* Do Mode intent input → un-typeable, un-clickable (`page.tsx:429`)
* Do Mode **Approve / Reject buttons** → un-clickable (`page.tsx:492-506`)
* Ask Mode "Clear selection" → un-clickable (`page.tsx:341`)
* Do Mode "Try again" → un-clickable (`page.tsx:518`)

**Correct model:** the overlay needs *two* modes — (a) full-screen interactive while drawing/approving, with a transparent-but-hit-testable background; (b) fully click-through only when passively displaying HUD. Or better: a **second small always-interactive window** for the intent/approval card, and keep the fullscreen overlay purely decorative and click-through.

### F3. Do Mode coordinates are physically meaningless
The chain, end to end:
1. `page.tsx:217` crops a region using **CSS pixels relative to the overlay window**.
2. `ipc.rs:92` multiplies by `devicePixelRatio` and crops out of the **primary monitor's** framebuffer.
3. `screen_capture.rs:78 / 166` **downscales the crop to max 1024px**.
4. `ai-client.ts:68` sends only that cropped, downscaled image and asks for *"integer screen X in pixels"*. The model has no idea what the crop offset was, what the screen resolution is, or what the downscale factor was.
5. `input_injector.rs:34` feeds whatever number comes back straight into `enigo.move_mouse(x, y, Coordinate::Abs)` — global physical screen coordinates.

The comment in `input_injector.rs:9` says *"DPI-scaled by frontend before sending"* — **the frontend never scales them.**
**Effect:** Do Mode clicks a semi-random point on the primary display. On a 2× Retina Mac it will be roughly the top-left quadrant of wherever you meant. This is a *"clicks something you didn't intend"* bug in a feature that moves the user's real mouse.

### F4. The Do-Mode click lands on MYLO's own overlay
`page.tsx:247-254`: `execute_do_action` runs **first**, `dismissOverlay()` runs after. At approve time the overlay must be interactive (so you could press Approve), i.e. **not** click-through, and it is fullscreen + always-on-top. The synthesized click at (x, y) is therefore delivered to the overlay window, not to Blender/Excel.
**Fix:** hide the overlay → wait for the compositor (~50-100 ms) → restore foreground focus to the target app → inject → re-show.

### F5. `scroll` conflates a coordinate with a scroll delta
`input_injector.rs:52` → `let y = action.y.unwrap_or(-3);` then `enigo.scroll(y, Axis::Vertical)`. The AI is prompted to return `y` as a **screen coordinate**, so a scroll action becomes `scroll(847)` — hundreds of notches.

### F6. Double-Esc dismiss can never fire
`page.tsx:107-116` listens for `keydown` on `window`. The overlay window is click-through and is never focused (`set_focus()` is never called on it), so it receives no keyboard events. Meanwhile:
* the in-app dashboard advertises it (`app/page.tsx:112`),
* the overlay HUD advertises it (`page.tsx` "double-Esc to dismiss"),
* the marketing site advertises it as a **safety feature**: *"ESC × 2 = gone… instantly kill all overlays and input handles."*

A safety kill-switch that doesn't work is the most serious kind of broken.
**Fix:** register Esc as a real global shortcut (double-tap detected in Rust), and make it also cancel any in-flight AI request and reset hotkey state.

### F7. Hotkey state desyncs permanently
`hotkey.rs:14-15` keeps **two independent** `Arc<Mutex<bool>>` (`state_ask`, `state_do`) with no shared source of truth, and the frontend's `dismissOverlay()` (`page.tsx:48`) hides the window without telling Rust.
Repro: Alt+Space (ask=true) → double-Esc/dismiss → window hidden but `state_ask` still `true` → next Alt+Space *hides* an already-hidden window. You now need two presses, forever, and Ask/Do fight each other.
**Fix:** one `Mutex<OverlayMode>` in Rust owned as Tauri state, with an IPC command the frontend calls on dismiss.

### F8. AppKit called from a non-main thread → UB / crash risk on macOS
`ipc.rs:21` and `ipc.rs:34` call `platform_macos::reassert_stream_safety()`, which does `msg_send![ns_win, setSharingType:]`. These are plain (non-`async`) `#[tauri::command]`s, which Tauri v2 executes on the async runtime's thread pool — **not** the main thread. All `NSWindow` mutation must happen on the main thread.
**Fix:** wrap in `app_handle.run_on_main_thread(move || …)`.

### F9. `verify_stream_safety` lies on macOS
`ipc.rs:133-137` returns a hardcoded `true` on non-Windows with the comment *"the overlay is … invisible to screen capture by nature of being a transparent, decoration-less window"* — which is not true; transparency has nothing to do with capture exclusion. Meanwhile `platform_macos.rs:51 is_stream_safe()` — the function that actually reads `sharingType` — **is never called from anywhere**.
**Effect:** the "🔒 Stream Shield Active" badge is unconditionally shown on macOS whether or not the protection is real. Given that stream-invisibility is your headline product claim, a false-positive here is a user-trust and liability problem.
**Also:** `NSWindowSharingNone` excludes the window from *other processes'* capture, but the app's own `xcap` display capture may still composite it in — needs an actual empirical test (OBS + Zoom + QuickTime + `xcap` self-capture) before you claim anything.

### F10. Multi-monitor is entirely unhandled
`Monitor::primary()` (Win, `screen_capture.rs:127`) / `.find(is_primary)` (mac, `:152`). One overlay window, one monitor, no per-display overlays, no coordinate translation. On any multi-display setup Ask captures the wrong screen and Do clicks the wrong screen.

### F11. Capture can hang forever
`screen_capture.rs:135-138` spawns a thread and `rx.await`s with no timeout. If WGC never delivers a frame (minimized, protected content, driver hiccup), the Ask spinner spins forever with no cancel path. Add a `tokio::time::timeout` and a user-visible failure state.

### F12. Provider selector is a placebo
`app/page.tsx:10` lets you pick Gemini **or** OpenAI and saves the key under that provider. `lib/ai-client.ts:24, 65` only ever calls `getApiKey('gemini')` and only ever hits `generativelanguage.googleapis.com`. Choose OpenAI, save your key, and every request answers *"Error: Please set your Gemini API key"*. README and the site both promise OpenAI **and** Claude.

### F13. Coach Mode is unreachable dead code
`page.tsx:307-322` renders it; the only trigger is the event `target-pos-changed`, which is **never emitted from Rust**, and no hotkey ever sets `mode = 'coach'`. Coach Mode is the default tab and the lead feature on the marketing site.

### F14. Voice / wake word does not exist
`app/page.tsx:110` "Alt + Space: Toggle **voice** ask mode" and a "Listening… / *What does this error mean?*" mock. Site: *"Local wake word & on-device OCR"*, *"Gemini Live & GPT-4o Realtime voice streaming"*. There is no microphone code, no STT, no OCR anywhere in the repo. Ask Mode is a hardcoded text prompt (`page.tsx:197`) — the user can't even type their own question.

---

## 3. 🟠 Security & privacy

### S1. API keys stored in plaintext, described as encrypted
`storage.rs` uses `tauri-plugin-store` → `mylo_secure.json` in the app-data dir. That is **unencrypted JSON on disk**. The filename is the only "secure" part.
* In-app copy: *"stored in an encrypted local store"* (`app/page.tsx:56`), *"Key saved to encrypted local store"* (`:23`).
* **Privacy Policy: *"Your API key is stored securely in your operating system's native keychain."*** — this is a factual misstatement in a published legal document about a credential with a billing balance attached.

**Fix:** use the OS keychain (`keyring` crate / DPAPI on Windows / Keychain Services on macOS), or Tauri Stronghold. Until then, change the copy on both the site and in the app *today* — that's a 10-minute edit and it removes real legal exposure.

### S2. The API key is handed to the renderer and put in a URL query string
`ai-client.ts:36, 81`: `?key=${geminiKey}`. Two issues: (a) the secret lives in the webview's JS heap, and `csp: null` (`tauri.conf.json:34`) means there is zero content-security policy on a window that renders model output; (b) query-string keys land in proxy/CDN logs.
**Fix:** move all provider calls into Rust. The key should never cross the IPC boundary into JS at all. Then delete `get_api_key` from the invoke handler.

### S3. `execute_do_action` is an unvalidated remote-control primitive
`ipc.rs:145` accepts arbitrary `{action_type, x, y, text}` from the renderer and executes it. No bounds check against screen geometry, no allow-list, no rate limit, no confirmation on the Rust side, no audit log. `"type"` will happily type into a terminal or a password field.
Combined with **prompt injection** — the model's instruction source is *a screenshot of arbitrary, potentially hostile screen content* — a web page that renders "click the red button at 400,300 and type `rm -rf ~`" is an attack vector. The approval gate is your only defence, and per F2 it isn't clickable.
**Fix:** validate in Rust (coords within a monitor, text length cap, deny-list for control keys), require the approval token to be minted in Rust, log every executed action locally.

### S4. Capabilities are wide open to the overlay window
`capabilities/default.json` grants `core:default` + the full `store:*` set to **both** windows. The overlay — the window that renders untrusted model output with no CSP — can read every stored API key. Split into two capability files (`main` = store access, `overlay` = no store).

### S5. Errors are swallowed; the UI reports success anyway
`storage.rs:11, 14` `eprintln!` on failure and `save_key` returns `()`. `ipc.rs:70` propagates nothing. So `app/page.tsx:23` shows **"Key saved"** even when the write failed. And in a Windows release build `#![windows_subsystem = "windows"]` (`main.rs:2`) means there's no console — `eprintln!` goes nowhere. You have no field diagnostics at all.
**Fix:** commands return `Result<_, String>`; `tauri-plugin-log` configured with a `LogDir` target so users can send you a log file.

---

## 4. 🟡 Config, packaging & distribution

| # | Finding |
|---|---|
| P1 | **`fullscreen: true` on the overlay** (`tauri.conf.json:31`). On macOS this creates a **native fullscreen Space** — the worst possible behaviour for an overlay (it gets its own desktop). On Windows it fights `alwaysOnTop` and covers the taskbar. Use an undecorated window sized to the monitor work-area instead. |
| P2 | **`WS_EX_LAYERED` added manually** (`lib.rs:48`) to a window whose webview already composites. Also, ex-style changes are applied without a `SetWindowPos(..., SWP_FRAMECHANGED \| SWP_NOMOVE \| SWP_NOSIZE \| SWP_NOZORDER)` flush. Expect intermittent "styles didn't take" bugs. |
| P3 | **`WS_EX_NOACTIVATE` is never set.** Showing the overlay steals focus from the app you're overlaying — which changes that app's state (focus rings, IME, active selection) and is exactly what an ambient assistant must not do. |
| P4 | **`bundle.macOS.frameworks: ["CoreGraphics","CoreVideo","AppKit"]`** — this key is for embedding *custom* `.framework` bundles into the `.app`. Listing system frameworks here at best does nothing, at worst makes the bundler try to copy system frameworks and breaks codesigning. Remove it; the `-framework` links come from the crates. |
| P5 | **No `minimumSystemVersion`** → defaults to 10.13, but `xcap 0.9` / `objc2-*` need macOS 12.3+ (ScreenCaptureKit era). Set `"minimumSystemVersion": "13.0"`. |
| P6 | **No universal binary target.** Building on Apple Silicon produces an arm64-only DMG; Intel Macs silently unsupported. Need `--target universal-apple-darwin`. |
| P7 | **No signing / notarization / entitlements** for either OS. No `bundle.macOS.entitlements`, no hardened-runtime entitlements for Accessibility/Screen Recording, no `certificateThumbprint`/`signCommand` for Windows. Unsigned = Gatekeeper blocks the Mac build outright and SmartScreen scares off Windows users. Site claims "0 warnings / MSIX auto-signed / Microsoft Store approved." |
| P8 | **No updater.** `tauri-plugin-updater` isn't installed and `createUpdaterArtifacts` is off. If you ship today, you can never push a fix to an installed user. |
| P9 | **`targets: "all"`** builds every bundle type including ones you'll never ship (deb/rpm/appimage on Linux). Be explicit. |
| P10 | **No autostart / login-item** despite the commit being titled "background daemon". `LSUIElement` gives you a dockless app, but nothing starts it at login on either OS. |
| P11 | **macOS permission flow is entirely missing.** `enigo` requires Accessibility; capture requires Screen Recording. Neither is pre-flighted (`AXIsProcessTrustedWithOptions`, `CGPreflightScreenCaptureAccess`), so on first run capture silently returns a black/empty image and Do Mode fails with a raw Rust error string. `NSAccessibilityUsageDescription` in `Info.plist` is **not** a real TCC prompt key — Accessibility can only be granted by walking the user to System Settings. You need a first-run onboarding screen. |
| P12 | **Tray click to reopen the dashboard is broken on macOS.** `TrayIconBuilder` with a `.menu()` shows the menu on left-click by default, so the `TrayIconEvent::Click` handler (`lib.rs:73`) never runs. Also `TrayIconEvent::Click` on Windows fires for down *and* up. Also the tray uses the full-colour app PNG instead of a template image → looks wrong in the macOS menu bar (and inverted in dark mode). |
| P13 | **Closing the main window bricks the app.** No `CloseRequested` interception. Close the dashboard → the window is destroyed → `get_webview_window("main")` returns `None` forever → the tray can never bring it back, but the process stays alive (the overlay window holds it). Only escape is tray → Quit. |
| P14 | **`.unwrap()` in `setup()`** at `lib.rs:35`, `:39`, `:66`. Any of these panics = the app dies at launch with no message. Especially `default_window_icon().unwrap()`. |
| P15 | **`objc = "0.2"`** is the unmaintained legacy crate, while `xcap` already pulls in modern `objc2 0.6`. Two ObjC runtimes in one binary, and `objc 0.2` has known soundness issues. Switch to `objc2`. |
| P16 | **Duplicate Next configs.** `mylo-app/next.config.mjs` (has `output: 'export'`) **and** `next.config.ts` (empty). *Verified:* Next 16 logs `✓ Running next.config.mjs` — the `.mjs` wins today, but this is an accident waiting to happen: if anyone deletes the `.mjs`, `output: 'export'` vanishes, `out/` is never produced, and `frontendDist: "../out"` breaks with a confusing error. Delete `next.config.ts`. |
| P17 | **`next/font/google` makes the desktop build non-hermetic.** *Verified:* `npm run build` **fails outright** without network access to `fonts.googleapis.com`. Worse: the two Geist fonts are downloaded and bundled but **never used** — `globals.css` forces `Trebuchet MS`/`Courier New` on everything. Use `next/font/local` or drop them. |
| P18 | **`typescript.ignoreBuildErrors: true`** in both apps. `strict: true` in tsconfig is decorative. `app/layout.tsx:20` uses the Next-16 generated `LayoutProps<"/">` type — fine, but you'd never know if it broke. |
| P19 | **`mylo-app/app/globals.css` is the marketing stylesheet copy-pasted in** (20 KB of `.hero`, `.pricing`, `.faq`, `.stealth-demo`…) and it's what causes B4. The desktop app needs its own ~100-line stylesheet. |
| P20 | **Metadata is still `create-next-app` boilerplate** — `app/layout.tsx:16-18`: title `"Create Next App"`, description `"Generated by create next app"`. This is the window/document title of your shipping product. `mylo-app/README.md` is also the untouched CNA readme. |
| P21 | Unused dependencies in `mylo-app`: `roughjs` (README claims the visual identity is built on it — it isn't, `design-system.tsx` is hand-written SVG paths), `framer-motion`, `shadcn` (a CLI shipped as a runtime dep), `tw-animate-css`, `@tauri-apps/plugin-store` (JS side unused), `@tauri-apps/plugin-global-shortcut` (JS side unused), and `components/ui/button.tsx` is imported by nothing. |
| P22 | Repo hygiene: `.DS_Store` **is committed at the repo root**; `mylo-app/src-tauri/check_out.txt` is a **committed build-failure log containing the author's local filesystem path** (`/Users/aryansharma/Desktop/MYLO OS/…`). No root `.gitignore`. Whole project is one squashed commit. No CI, no tests, no `.github/`. |
| P23 | Mixed package managers: `pnpm-lock.yaml` in `mylo frontend/`, `package-lock.json` in `mylo-app/`. Plus a stray `pnpm-workspace.yaml` in a non-workspace. Also the directory name **`mylo frontend`** has a space in it — that breaks a surprising amount of CI tooling and shell scripts. |
| P24 | Cargo package is named `app`, `repository = ""`, authors `["MYLO Team"]`. Version is tracked in 3 places (`Cargo.toml`, `tauri.conf.json`, `package.json`) with no sync mechanism. |

---

## 5. 🟡 Marketing site & legal (`mylo frontend/`)

These matter as much as the code, because they're the promises the code has to keep.

| # | Finding |
|---|---|
| M1 | **There is no download link on the entire site.** Every CTA is a same-page anchor: nav "Download for Windows" → `#pricing`; "Download Free .MSIX" → `#top`; "Start 7-Day Free Trial" → `#top`. A visitor who wants to give you money or install the app literally cannot. |
| M2 | **Unsupportable claims:** "Windows 1-Click Install (**MS Store Approved**)", "signed MSIX", "v0.9 Beta", "**0.02s** capture latency", "**~35MB** RAM", "0 warnings install friction", "adds under 1ms of overlay latency", "Local wake word & on-device OCR", "Gemini Live & GPT-4o Realtime voice streaming". None of this exists in the repo, and the Windows build doesn't compile. |
| M3 | **Privacy Policy §2 is false**: *"Your API key is stored securely in your operating system's native keychain."* It's plaintext JSON (S1). |
| M4 | **Privacy Policy §4 is false in the other direction**: *"We collect minimal, anonymized telemetry strictly for crash reporting."* There is no telemetry in the app. Meanwhile the **site** runs `@vercel/analytics` with no cookie/GDPR notice and no mention in the policy. |
| M5 | **Terms §1** forbids reverse-engineering and redistribution — but the repo is **public and MIT-licensed** (`LICENSE`). Directly contradictory. |
| M6 | Terms/Privacy have no governing law, no jurisdiction, no data-controller identity, no refund policy — yet the site sells a $15/mo subscription. There is no payment integration, no accounts, no backend of any kind. |
| M7 | **Broken mailto**: the "Keep me posted" CTA in the platform modal points to `hello@aria.example` — a placeholder domain from a template. |
| M8 | Apple and Linux logos are **hot-linked from `thesvg.org`** at runtime (third-party availability risk + Apple trademark usage on a commercial page). |
| M9 | Contact form posts to `formsubmit.co` with `_captcha: false` and a hardcoded `_next` redirect to `https://mylo-frontend.vercel.app/contact/success` (breaks on any other domain/localhost). Your personal email is in plain text in 6 places across the DOM → guaranteed scraping. |
| M10 | **Positioning risk.** The hero — *"to everyone else on your call, stream, or screen share — it doesn't exist"* — plus the stealth section is, functionally, an undetectable-overlay pitch. Your own Terms §4 then bans proctoring/exam use. That contradiction is exactly what gets an app rejected by the Microsoft Store and Apple, and it will shape how press and platforms read the product. Pick a lane and make the whole site consistent with it. |
| M11 | Missing SEO/social basics: no `metadataBase`, no `openGraph`/`twitter` card, no `sitemap.ts`, no `robots.ts`, no OG image. `generator: 'v0.app'` is still in the metadata. `package.json` name is `"my-project"`. `vercel.json` is `{"name": "MYLO"}` (a deprecated no-op key). |
| M12 | Footer status widget hardcodes "Windows: LIVE / macOS: IN PROGRESS" in 4 separate files — while the repo's latest commit is *"complete macOS support"* and Windows doesn't build. Whatever the truth is, it should live in one constant. |
| M13 | `.up-right` class is referenced by the `ArrowUpRight` shim in `page.tsx` but never defined in `globals.css` — the arrow points the wrong way. Cosmetic, but it's on every page footer. |

---

## 6. What I'd do — proposed plan

I'd resist the urge to fix these in file order. There's a dependency chain: you can't test any flow until the thing builds and the overlay is actually transparent.

### Phase 0 — "make it build and make it visible" (½–1 day)
Goal: `npm run tauri dev` works on both OSes and the overlay is see-through.
1. B1 `productName` → `MYLO` + `mainBinaryName`
2. B2 real bundle identifier + `bundle.publisher`
3. B5 `macOSPrivateApi: true`
4. B7 add `@tauri-apps/cli` to devDeps
5. P16 delete `next.config.ts`
6. B4 + P19 give `/overlay` its own layout + minimal stylesheet; strip marketing CSS from the app
7. B3 rewrite `screen_capture.rs` against `windows-capture` 1.5, and `=`-pin every native crate
8. P17 self-host or drop the Google fonts

**Exit test:** on both OSes, `tauri dev` launches, the overlay window shows, and you can see your desktop through it.

### Phase 1 — "make one flow real end-to-end" (3–5 days)
Pick **Ask Mode only**. Ignore Do and Coach until Ask is genuinely good.
1. B6 hotkeys: `Pressed` only
2. F7 single shared overlay-state in Rust, with an IPC command the frontend calls on dismiss
3. F2 rework the interactivity model — I'd recommend a small **separate always-interactive window** for cards/inputs, keeping the fullscreen overlay click-through
4. F6 Esc double-tap as a real global shortcut in Rust (this is a safety feature — treat it as one)
5. F1 + F8 macOS: actually toggle `ignoresMouseEvents`, and dispatch all AppKit calls via `run_on_main_thread`
6. F10 + F3 fix the coordinate space: capture the monitor the overlay is on, translate window-relative → monitor-relative → global physical, and unit-test the arithmetic
7. F11 capture timeout + a real error state
8. P3 `WS_EX_NOACTIVATE` so MYLO stops stealing focus
9. Let the user actually **type a question** in Ask Mode
10. S5 real `Result`s + file logging

**Exit test:** on a 2-monitor Windows box and a Retina Mac, circle something on either screen and get a correct answer, 10 times in a row, with the right pixels captured.

### Phase 2 — "make it honest" (1–2 days, can run in parallel)
This is cheap and it removes real liability. Do it before anyone else reads the site.
1. S1 keychain storage (or, same day, fix every "encrypted"/"keychain" claim in the app + Privacy Policy)
2. S2 move all provider calls into Rust; the key never enters JS
3. F12 either implement OpenAI/Claude routing or remove them from the UI, README and site
4. F13/F14 remove Coach Mode and voice/OCR/wake-word claims until they exist — or ship them
5. M1 a real download link, or replace the CTAs with a waitlist
6. M2/M3/M4/M5/M6/M7 rewrite the claims, fix the Terms↔MIT contradiction, remove the fake telemetry clause, disclose Vercel Analytics, fix `hello@aria.example`
7. F9 delete the hardcoded `true`; wire up `is_stream_safe()` and **actually test** against OBS, Zoom, Discord, QuickTime and your own capture path before showing that badge
8. M10 decide the positioning story deliberately

### Phase 3 — "make Do Mode safe" (4–7 days)
Only after Phase 1. This is the feature that can hurt someone's machine.
1. F3 a real coordinate contract: send the **full screen** (or send the crop + its offset and require crop-relative output), have the model return normalized 0–1 coords, and convert in Rust
2. F4 hide overlay → restore target-app focus → delay → inject
3. F5 separate `scroll_amount` from `y`
4. S3 Rust-side validation: bounds-check against real monitor geometry, cap `text` length, deny-list dangerous input, rate-limit, and write a local audit log of every executed action
5. Show the user a **ghost cursor preview at the resolved coordinates** before they approve — that's your marketing promise and it's also the only way a human can sanity-check a coordinate
6. An undo/panic path: Esc during execution aborts

### Phase 4 — "make it shippable" (3–5 days)
1. P7 codesigning + notarization (mac) and Authenticode (win)
2. P8 `tauri-plugin-updater` + signed artifacts — without this you can't fix bugs in the field
3. P11 first-run permission onboarding for macOS (Accessibility + Screen Recording), with re-check and deep links to System Settings
4. P13 intercept `CloseRequested` → hide; P12 tray behaviour per-platform; P10 autostart
5. P5/P6 min macOS version + universal binary
6. GitHub Actions: build both OSes on every PR (this alone would have caught B1, B2, B3, B7), `cargo clippy`, `tsc --noEmit`, `eslint`
7. P22/P23 remove `.DS_Store` + `check_out.txt`, add a root `.gitignore`, pick one package manager, rename `mylo frontend` → `web`

### Things I'd consciously defer
Coach Mode, voice/wake word, OCR, the Pro tier + billing, Linux. None of them should be touched until Ask and Do are solid on both OSes — and all of them should come off the marketing site until then.

---

## 7. Two structural suggestions

1. **Move the AI layer into Rust.** Right now the renderer holds the API key, builds the prompt, parses the response, and hands an executable action back to Rust, which trusts it blindly. Inverting that (Rust owns key + prompt + parse + validate; the webview only renders and collects intent) fixes S2, S3 and half of F3 simultaneously, and gives you one place to add retries, timeouts, provider routing and an audit log.

2. **Make the overlay two windows, not one.** A click-through, always-on-top, capture-excluded *canvas* window for annotations, plus a small, focusable, normal *card* window for inputs and approvals. Almost every one of F1/F2/F4/F6 is a symptom of trying to make a single window be both simultaneously — which the OS will not let you do on either platform.
