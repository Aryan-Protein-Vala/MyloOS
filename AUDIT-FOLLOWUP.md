# MYLO — Audit Follow-Up: what commit `a8d28c1` actually fixed

**Reviewed:** `6d7e366` → `a8d28c1` (3 commits: `cf2ae18`, `7288cf5`, `a8d28c1`)
**Files changed:** 14 · **Files in `mylo frontend/`:** 0
> **⚠️ This document is historical.** It records findings as of `6d7e366`. Most have since been fixed — see **[FIXES.md](FIXES.md)** for the current scoreboard.


---

## Verdict

**7 findings fully fixed, 9 partially fixed, ~40 untouched, and 1 serious regression.**

The genuinely good fixes: real `productName`/`identifier`, `@tauri-apps/cli`, cross-platform `set_ignore_cursor_events` (which fixes the dead macOS mouse), `is_visible()` as hotkey source of truth, close-to-tray, error propagation out of capture, and deleting `next.config.ts`.

But **the four things that actually stop MYLO from running are all still there**, and one "fix" made things worse than before:

> 🔴 **`keyring = "3.6.3"` has no backend features enabled, so your API keys are now written to an in-memory mock store and are gone the moment the app restarts.** Before this commit they at least persisted (in plaintext). This is a regression. One-line fix — details in N1.

---

## 1. Scoreboard — every finding from the first audit

### Blockers

| # | Finding | Status | Evidence |
|---|---|---|---|
| **B1** | `productName` contains `:` | ✅ **Fixed** | now `"MYLO"` |
| **B2** | `identifier` = `com.tauri.dev` | ✅ **Fixed** | now `com.myloos.app`. ⚠️ still no `bundle.publisher` — Microsoft Store rejects when publisher is derived and equals the product name |
| **B3** | Windows capture doesn't compile | ❌ **Not fixed** | `screen_capture.rs` still has all 3 hard errors: `GraphicsCaptureApi::start` (type doesn't exist in `capture`), `Settings::new` with 5 args (1.5.0 needs 8), `on_closed(&mut self, _cc)` (trait takes no arg). New dead code added on top — see N6 |
| **B4** | Overlay is an opaque sheet | ⚠️ **Half fixed — still opaque** | `body { background: transparent !important }` was added, but `globals.css` still has `html { background: var(--background) }` (`#faf8f5`) and `--background` isn't redefined in the overlay's `:root`. The **root element** paints the window canvas, so it's still solid cream. *Verified: rebuilt the app, `out/_next/static/chunks/*.css` still contains `html{scroll-behavior:smooth;background:var(--background)}`* |
| **B5** | macOS needs `macOSPrivateApi: true` | ❌ **Not fixed** | absent from `tauri.conf.json` |
| **B6** | Hotkeys fire twice per press | ❌ **Not fixed** | `hotkey.rs:15, 31` still `move \|_app, _shortcut, _event\|` — `event.state()` is never checked. Press → handler runs for Pressed *and* Released → show then hide. Switching to `is_visible()` didn't fix the cause, it just made the outcome racy (depends on whether the main-thread `show()` has landed before the release event) |
| **B7** | `@tauri-apps/cli` missing | ✅ **Fixed** | added to devDependencies |

### Core flows

| # | Finding | Status | Notes |
|---|---|---|---|
| **F1** | macOS overlay can't get mouse events | ✅ **Fixed** | `set_ignore_cursor_events()` now used on both platforms. Good fix — this is the right API |
| **F2** | CSS `pointer-events` can't beat OS click-through | ❌ **Not fixed** | `page.tsx:162` and `:182` still call `set_overlay_interactive({interactive:false})` immediately before showing cards that need clicks. Do Mode's intent input and Approve/Reject are still unreachable |
| **F3** | Do Mode coordinates are meaningless | ❌ **Not fixed** | `input_injector.rs` untouched; the AI still gets a cropped+downscaled image and is asked for absolute screen pixels |
| **F4** | Injected click lands on MYLO's own overlay | ❌ **Not fixed** | still executes before `dismissOverlay()` |
| **F5** | `scroll` uses `y` as the scroll delta | ❌ **Not fixed** | `input_injector.rs:52` unchanged |
| **F6** | Double-Esc kill switch can't fire | ⚠️ **Partial** | `overlay.set_focus()` added on show, so Esc may now reach the overlay while it's focused. But it's still a webview `keydown` listener, not a global shortcut — it dies the moment the overlay goes click-through or the user clicks another app. A safety kill-switch shouldn't depend on focus |
| **F7** | Hotkey state desync | ✅ **Mostly fixed** | `is_visible()` removed the desync with frontend dismiss. Remaining wrinkle: the Do hotkey while the Ask overlay is open just *hides* it instead of switching mode |
| **F8** | AppKit called off the main thread | ❌ **Not fixed** | `platform_macos.rs` untouched; `reassert_stream_safety()` still does raw `msg_send!` from sync `#[command]`s, which Tauri runs on the thread pool |
| **F9** | `verify_stream_safety` returns hardcoded `true` on macOS | ❌ **Not fixed** | `ipc.rs` still returns `true` unconditionally with the same incorrect comment. `is_stream_safe()` still never called |
| **F10** | Multi-monitor unhandled | ⚠️ **Partial, likely wrong** | macOS now picks the monitor containing `(x,y)` — but `x,y` arrive **already multiplied by `devicePixelRatio`** (`ipc.rs:92`) while xcap monitor bounds are not, so on any Retina display the lookup falls through to primary. Also `e.clientX` is **window-relative**, not desktop-global, so `x - mx` is wrong on a secondary display. Windows was explicitly punted (see N6) |
| **F11** | Capture can hang forever | ❌ **Not fixed** (errors ✅) | still no timeout on either path, but `capture_crop_async` now returns `Result<_, String>` and macOS surfaces real messages — good improvement |
| **F12** | Provider selector is a placebo | ⚠️ **Partial** | an OpenAI path exists now, but the logic is `if (geminiKey) … else if (openaiKey)`. The dashboard toggle still has **zero** effect: if a user has both keys and selects OpenAI, they get Gemini |
| **F13** | Coach Mode is unreachable dead code | ❌ **Not fixed** | still no trigger, still the lead feature on the site |
| **F14** | Voice / wake word doesn't exist | ❌ **Not fixed** | dashboard still literally says "Toggle **voice** ask mode" |

### Security

| # | Finding | Status | Notes |
|---|---|---|---|
| **S1** | Keys in plaintext, described as encrypted | 🔴 **Attempted → regressed** | See **N1**. `keyring` is the right call, but with no backend feature it's a mock store. Keys no longer persist at all, and the UI still says "Key saved to encrypted local store" |
| **S2** | Key in the renderer / in a URL query string | ⚠️ **Partial** | ✅ moved to the `x-goog-api-key` header (good). ❌ the key still crosses IPC into JS, and `csp: null` is unchanged. Now **both** provider keys are pulled into the renderer on every call |
| **S3** | `execute_do_action` is unvalidated remote control | ❌ **Not fixed** | still a straight pass-through, no bounds check, no text cap, no rate limit, no audit log |
| **S4** | Capabilities wide open to the overlay | ❌ **Not fixed** | `capabilities/default.json` unchanged |
| **S5** | Errors swallowed, UI reports success | ⚠️ **Partial** | capture now returns `Result` ✅, but `save_api_key` still returns `()` and `eprintln!`s. This is exactly why N1 is invisible to the user |

### Packaging / config / hygiene

| Status | Findings |
|---|---|
| ✅ **Fixed** | **P13** close-main-window no longer bricks the app (`CloseRequested` → `prevent_close` + hide) · **P16** `next.config.ts` deleted |
| ⚠️ **Partial** | **P2** manual `WS_EX_TRANSPARENT` toggling removed (good) — `WS_EX_LAYERED` still applied by hand, still no `SWP_FRAMECHANGED` · **P14** two of three `unwrap()`s guarded; `overlay_window.hwnd().unwrap()` remains |
| ❌ **Not fixed** | **P1** overlay still `fullscreen: true` (still creates its own Space on macOS) · **P3** no `WS_EX_NOACTIVATE` — and now **worse**, see N10 · **P4** system frameworks still in `bundle.macOS.frameworks` · **P5** no `minimumSystemVersion` · **P6** no universal binary · **P7** no signing/notarization/entitlements · **P8** no updater · **P9** `targets: "all"` · **P10** no autostart · **P11** no macOS permission onboarding · **P12** tray click still broken on macOS, still a non-template icon · **P15** `objc 0.2` still alongside `objc2` · **P17** build still needs network for Google Fonts (*re-verified: build fails offline*) · **P18** `ignoreBuildErrors: true` · **P19** marketing CSS still in the app · **P20** metadata still `"Create Next App"` / `"Generated by create next app"` · **P21** unused deps — **now worse**, see N7 · **P22** `.DS_Store` and `check_out.txt` still tracked · **P23** mixed pnpm/npm, dir still named `mylo frontend` · **P24** cargo package still `app`, empty `repository` |

### Marketing site & legal — **0 of 13 fixed**

`git diff --stat 6d7e366 a8d28c1 -- "mylo frontend/"` → **empty**. Not one file touched, despite `cf2ae18`'s message ("Fix all frontend audit findings" — that referred to the app's frontend).

So all of M1–M13 stand: no download link anywhere, "MS Store Approved" / "signed MSIX" / "0.02s" / "~35MB", the $15/mo tier with no billing, `hello@aria.example`, Terms-vs-MIT contradiction, undisclosed Vercel Analytics, hot-linked Apple/Linux logos.

⚠️ **M3 got worse.** The Privacy Policy says *"Your API key is stored securely in your operating system's native keychain."* The code now **imports a keychain library with no keychain backend compiled in**. The claim is still false — and now the keys don't even survive a restart.

---

## 2. New problems introduced by this commit

### 🔴 N1. `keyring` with no backend = mock store = keys vanish on restart
`Cargo.toml`: `keyring = "3.6.3"` — no `features`.

From the keyring 3.6.3 docs, verbatim:
> *"If no specified credential store features apply to a given platform, this crate will use the (platform-independent) **mock** credential store on that platform. There are **no default features** in this crate: you must specify explicitly which platform-specific credential stores you intend to use."*

*Verified in your own `Cargo.lock`:*
```
[[package]]
name = "keyring"
version = "3.6.3"
dependencies = [ "log", "zeroize" ]      ← that's all
```
No `security-framework` (macOS Keychain), no `windows-sys` (Windows Credential Manager). Zero backends linked.

**Effect:** `set_password` succeeds into RAM. The key works for the rest of that session. Restart MYLO → gone. And because `save_key` still swallows errors (`S5`), the UI cheerfully says *"Key saved to encrypted local store."* Users will re-enter their key every single launch and have no idea why.

**Fix (one line):**
```toml
keyring = { version = "3.6.3", features = ["apple-native", "windows-native"] }
```
Then verify persistence across a restart — and note that on macOS the Keychain ACL is tied to the code signature, so an **unsigned** dev build will re-prompt on every rebuild (expected; goes away once P7 is done).

### 🟠 N2. The advertised hotkey is not the hotkey that's registered
`hotkey.rs` registers `Modifiers::SUPER | Modifiers::CONTROL | Modifiers::SHIFT` + `Space`/`KeyD`.
`app/page.tsx` tells the user **"Cmd + Shift + Space"** (Mac) / **"Ctrl + Shift + Space"** (PC).
The real combo is **Cmd+Ctrl+Shift+Space** / **Win+Ctrl+Shift+Space**. Nobody will discover that. (Also worth checking `Ctrl+Cmd+Shift+Space` on macOS against the Emoji picker's `Ctrl+Cmd+Space` — they're one modifier apart.)

### 🟠 N3. `navigator.userAgent` runs at build time in a static export
`app/page.tsx:112-115` reads `navigator.userAgent` in a client component. With `output: 'export'`, Next prerenders it in **Node**, where `navigator.userAgent === "Node.js/22"`.
*Verified in the build output:* `out/index.html` contains `on your <!-- -->PC<!-- -->` and `<strong>Ctrl…`.
So the shipped HTML always says PC/Ctrl, and on macOS the client renders Mac/Cmd → **React 19 hydration mismatch** on every dashboard load. Use a `useEffect` + state, or `@tauri-apps/plugin-os`.

### 🟠 N4. Gemini model downgraded to a retired one
`gemini-2.5-flash` → **`gemini-1.5-flash`** in both `askAi` and `analyzeForDoMode`. The 1.5 line has been retired for new API projects — most new keys will get a 404/`NOT_FOUND`. This looks like an accidental downgrade during the header refactor.

### 🟡 N5. Confused dead code in the Windows capture path
```rust
let monitors = Monitor::enumerate()…;
let mut target_monitor = monitors.first().cloned();   // never read
// …we'll just try to use the primary monitor for now…
// Let's just use primary and ignore the multi-monitor bug for Windows for a second
let primary = Monitor::primary()…;
```
An unused variable, an extra enumeration call, and three comments arguing with themselves — shipped in a file that doesn't compile anyway (B3). Worth deleting when B3 is done.

### 🟡 N6. Stronghold added but never wired up
`tauri-plugin-stronghold` (Rust) + `@tauri-apps/plugin-stronghold` (JS) are now dependencies. The plugin is **not registered** in `lib.rs`, has **no capability permissions**, and is used nowhere. Meanwhile `tauri-plugin-store` is *still* registered. You now have three secret-storage mechanisms in the tree and are using the only one that doesn't persist. Pick keyring; drop the other two.

### 🟡 N7. The overlay now steals focus on every show
`overlay.set_focus()` was added to both hotkey handlers, and there's still no `WS_EX_NOACTIVATE`. For an *ambient* assistant this is the wrong default: showing MYLO now yanks focus off Blender/Excel/your terminal, changing that app's state — and it makes F4 (the injected click hitting the overlay) more likely, not less. It was presumably added to make Esc work; the right fix for that is a global shortcut (F6).

### 🟡 N8. Two keychain round-trips per AI request
`askAi`/`analyzeForDoMode` now call `getApiKey('gemini')` **and** `getApiKey('openai')` on every request — two IPC hops plus two keychain reads (which, once N1 is fixed, can trigger an OS prompt) before every single question.

---

## 3. What I'd do next — the short list

You've cleared the config blockers, which is real progress. Six things stand between here and "it runs":

1. **N1 — add `features = ["apple-native", "windows-native"]` to keyring.** One line. Do it first; right now every key a user enters is lost. While you're there, make `save_api_key` return `Result` so the UI stops lying (S5).
2. **B4 — finish the transparency fix.** `body` isn't enough; the `html` background paints the window canvas. Give `/overlay` its own layout that doesn't import the marketing `globals.css` at all — that's the real fix, and it kills P19 too.
3. **B6 — one line in `hotkey.rs`:** `if event.state() != ShortcutState::Pressed { return; }`. Until this lands, no hotkey works, so nothing else can be tested by hand.
4. **B5 — `"macOSPrivateApi": true`.** (And decide now that this means no Mac App Store.)
5. **B3 — rewrite the Windows capture against `windows-capture` 1.5** and `=`-pin every native crate. Then delete N5's dead code.
6. **N2/N3 — make the dashboard show the shortcut that's actually registered,** computed at runtime rather than baked in at build time.

After those six, `tauri dev` should give you a working, see-through overlay on both OSes for the first time — and *then* Phase 1 of the original plan (Ask Mode end-to-end) becomes testable.

**Still completely untouched and worth scheduling:** F2 (the click-through model — this is the one that needs a design decision, not a patch), F3/F4/F5 + S3 (Do Mode correctness and safety), F9 (the Stream Shield badge is currently unconditional on macOS), and **the entire marketing site + Privacy Policy**, where M3 is now doubly inaccurate.
