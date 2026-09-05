# MYLO — Fix Log

The companion to [`AUDIT.md`](AUDIT.md) (findings at `6d7e366`) and
[`AUDIT-FOLLOWUP.md`](AUDIT-FOLLOWUP.md) (what upstream commit `a8d28c1` fixed).
**This file is the current scoreboard.** Where the two audit documents disagree
with this one, this one is right.

---

## Read this first: what is and is not verified

| Layer | Verified how | Confidence |
| --- | --- | --- |
| `mylo-app` web layer | `tsc --noEmit` clean, `next build` green, emitted CSS inspected | **High — empirical** |
| `mylo frontend` site | `tsc --noEmit` clean, `next build` green, pages fetched and read | **High — empirical** |
| `mylo-app/src-tauri` (Rust) | **Not compiled.** No Rust toolchain could be installed in this environment (`rustup` fetch fails at the TLS layer). Every Rust change was written against docs.rs API pages read during the audit. | **Doc-driven — unverified** |

The Rust work is careful and each API was checked against its published
signature, but *careful* is not *compiled*. **The CI workflow added in this pass
is the thing that will actually prove it**, because it builds the crate on both
`windows-latest` and `macos-latest` — the two platforms whose capture backends
are mutually exclusive and neither of which can validate the other. Expect the
first CI run to surface some compile errors; that run is the point.

---

## Desktop app — Rust core

| ID | Finding | Status |
| --- | --- | --- |
| B1, B2, B7 | Config-level blockers | Fixed upstream at `a8d28c1` |
| B3 | Windows capture written against an API `windows-capture` 1.5 does not have (`GraphicsCaptureApi` type, wrong `on_closed` arity, wrong `Settings::new` arity) | **Rewritten** against the verified 1.5 surface: 8-arg `Settings::new`, `on_closed(&mut self)`, `Monitor::from_raw_hmonitor` to bridge the HMONITOR, `buffer_crop` + `as_nopadding_buffer` |
| B5 | macOS transparency needs `macOSPrivateApi` | **Fixed** — and the Mac App Store consequence is now written down rather than discovered later |
| B6 | Global shortcut handler fired on both press *and* release, so every hotkey toggled twice and cancelled itself | **Fixed** — handler returns unless `state == Pressed` |
| N1 | `keyring` 3.6.3 has **13 feature flags and zero enabled by default**, so the bare dependency compiled with no credential backend and silently dropped every key | **Fixed** — `apple-native` / `windows-native` opted in per target |
| N5 | Dead capture code left behind | **Removed** |
| S2, S3, S5 | Do Mode had no server-side gate; `save_api_key` swallowed errors | **Fixed** — `approve_do_action` arms a **single-use** guard with the exact action; `execute_do_action` refuses unless armed *and* refuses while the overlay is visible; commands return `Result` |
| F2 | Click-through model | **Redesigned.** OS click-through is all-or-nothing per window and CSS `pointer-events` cannot pass a click to an app underneath. Exactly one derived value (`needsPointerEvents`) drives exactly one `set_overlay_interactive` call. Coach mode never takes clicks. |
| F3, F4, F5 | Do Mode coordinate correctness | **Fixed** via the coordinate contract (below) plus Rust-side re-validation against real desktop bounds |
| F9 | Stream Shield badge was unconditionally green on macOS | **Fixed** — reads back the real `sharingType` |
| — | AppKit calls off the main thread | **Fixed** — every `NSWindow` touch goes through `AppHandle::run_on_main_thread` with a cloned window; the read-back path fails closed on a 500 ms timeout rather than deadlocking |
| — | Capabilities over-granted | **Tightened to `core:default` + `log:default`.** Capabilities gate what the *webview* may invoke; every privileged operation here is a hand-written Rust command that validates its own input, so no core window or store permission is needed at all. |
| — | `macOSPrivateApi: true` was set in `tauri.conf.json` without the matching `macos-private-api` Cargo feature | **Fixed.** `tauri-build` hard-errors on that mismatch, so the macOS build could never have succeeded. |
| — | `panic = "abort"` in the release profile | **Removed.** Capture and injection run on their own threads; a panic there should lose the operation, not the user's whole session. |
| P22 | Stale committed build log | **Deleted** |

### The coordinate contract (new, and the reason Do Mode can be trusted)

- `screen_capture` and `input_injector` speak **global desktop physical pixels**, always.
- Logical→physical conversion happens in exactly one place, `ipc::to_global_rect`,
  using `outer_position()` + `scale_factor()`. Browser `devicePixelRatio` is never trusted.
- `capture_screen_crop` returns the rect it captured → the model replies in ratios
  `[0,1]` → the frontend maps back to global physical → **Rust re-validates** before injecting.

---

## Desktop app — web layer *(all empirically verified)*

| ID | Finding | Status |
| --- | --- | --- |
| B4 | The overlay window was opaque, blacking out the user's screen | **Fixed and proven.** The dashboard and overlay now live in separate route groups with **separate root layouts**, so Next emits them a stylesheet each. Verified in the build output: the overlay's chunk is 3.8 KB of `html,body{…background:0 0!important}` with **zero** references to `faf8f5` or `var(--background)`; the dashboard keeps its own 35.7 KB chunk. CI now asserts this every push. |
| F1, F7 | Fixed upstream | — |
| F6, F8, F10, F11, F13, F14 | Assorted frontend correctness | **Fixed** |
| N2, N3 | Dashboard displayed a hardcoded shortcut instead of the registered one | **Fixed** — `get_shortcuts` and `get_platform` come from the backend; no `navigator` sniffing |
| N4, N6, N7, N8 | Provider selection, error surfacing, redundant keychain reads | **Fixed** in `lib/ai-client.ts`: real `resolveProvider` that honours the user's choice and falls back *with a warning*, throws a typed `AiError` when neither key exists, 45 s `AbortController` timeout, extracts the provider's actual error message, strips ```json fences |
| P14 | `ignoreBuildErrors: true` | **Off.** Type errors fail the build again, in both apps. |
| P17 | Build required reaching Google Fonts | **Fixed** — system font stack; offline builds work |
| P19 | Overlay/dashboard CSS coupling | Dissolved by the B4 fix |
| — | Dead dependencies | Removed `@tauri-apps/plugin-stronghold`, `plugin-store`, `plugin-global-shortcut`, `framer-motion`, `roughjs` (0 references each). Kept `shadcn` — `globals.css` imports from it. |
| — | Static export routing | `trailingSlash: true`, so `out/overlay/index.html` is emitted and Tauri's asset protocol resolves `/overlay` identically in dev and release |

---

## Marketing site *(all empirically verified)*

Every claim below was either made true or removed. Nothing was left aspirational.

| ID | Finding | Status |
| --- | --- | --- |
| M1 | No download link existed anywhere; every CTA was a same-page anchor | **Resolved honestly.** There is no artifact to download, so the CTA no longer pretends there is — it points at the repository and says "pre-release". |
| M2 | "MS Store Approved", "signed MSIX", "v0.9 Beta", "0.02s capture latency", "~35MB RAM", "0 warnings", "under 1ms overlay latency", "local wake word & on-device OCR", "Gemini Live & GPT-4o Realtime" | **All removed.** Invented benchmarks replaced with statements about *architecture* (which is checkable) rather than *numbers* (which were not measured). |
| M3 | Privacy §2 claimed keys were in the native keychain when they were plaintext JSON | **Now true**, and made specific — Keychain on macOS, Credential Manager on Windows, never written to a file in the app |
| M4 | Privacy §4 claimed telemetry that did not exist, while the site ran undisclosed Vercel Analytics | **Both fixed.** The app is stated to collect nothing; Vercel Analytics is disclosed, scoped to the website, and explicitly excluded from the desktop app. |
| M5 | Terms forbade reverse-engineering of MIT-licensed code | **Fixed** — the MIT Licence is named and given precedence over the Terms for the software itself |
| M6 | No governing law, jurisdiction, controller identity, or refund policy, on a site selling $15/mo | **Fixed on both sides.** The Pro tier is relabelled *planned, not available*, with an explicit "this is not an offer to sell"; Terms gained Governing Law and Changes clauses; Privacy gained a named data controller and identifies Google/OpenAI as independent controllers. |
| M7 | `hello@aria.example` placeholder | **Fixed** |
| M8 | Apple and Linux logos hot-linked from `thesvg.org` | **Fixed** — self-hosted `/apple.svg` and `/linux.svg` |
| M9 | Contact form hardcoded its redirect to the production host, so every localhost and preview submission bounced to the live site | **Fixed** — derived from `window.location.origin` |
| M10 | Stealth section marketed covert use in meetings, which the site's own Terms §4 forbids | **Reframed.** The pitch is now "keep your notes out of the recording", not "nobody on the call sees a thing", which is both defensible and consistent with §4. |
| M11 | No `metadataBase`, OG, Twitter card, sitemap, robots; `generator: 'v0.app'`; package named `my-project` | **All fixed**, plus `app/sitemap.ts` and `app/robots.ts` |
| M12 | Footer status hardcoded in five files | **Centralised** in `lib/site-status.ts` + `components/platform-status.tsx` |
| M13 | Missing `.up-right` style | Resolved upstream — real `lucide-react` icon now |

The capture-exclusion claim is now stated **with its precondition**: Windows 10
2004+, and MYLO reports when it cannot protect the overlay instead of implying
it always can. That precondition is the difference between a feature and a
liability.

---

## Repository hygiene

| ID | Finding | Status |
| --- | --- | --- |
| P2 | No root `.gitignore`; committed `.DS_Store` | **Fixed** — root ignore covering Node, Next, Rust/Tauri, secrets, editors; `.DS_Store` purged and untracked; `mylo-app/.gitignore` extended to `src-tauri/target`, `gen/`, `WixTools/` |
| P13, P16 | Fixed upstream | — |
| — | No CI at all | **Added** `.github/workflows/ci.yml` |
| — | Two lockfiles in the site (a stray `package-lock.json` next to `pnpm-lock.yaml`) | **Fixed** — pnpm is the site's package manager; `mylo-app`'s npm lockfile regenerated in sync with its pruned `package.json` |
| — | README described software that did not exist (`rough.js`, Claude support, Windows-only) | **Rewritten** to match the code, including the security model and the coordinate contract |

### What CI checks

1. **Desktop web layer** — typecheck, static export, then assert `out/index.html`
   *and* `out/overlay/index.html` exist and the overlay's stylesheet contains no
   opaque background. That last check is a regression test for B4, the bug that
   blacked out the user's screen.
2. **Rust core on `windows-latest` *and* `macos-latest`** — clippy and tests, with
   the frontend built first because `tauri-build` reads `frontendDist` at compile
   time and fails if the directory is missing. `cargo fmt` is advisory so a
   formatting nit cannot hide a compile error further down the job.
3. **Marketing site** — typecheck and build.

---

## Still open — deliberately

| ID | Item | Why it is still open |
| --- | --- | --- |
| **S4** | No rate limiting or spend cap on model calls | Needs a product decision on where the ceiling sits, not a patch |
| **P7** | Code signing and notarisation | Requires an Apple Developer account and a Windows certificate. Until then the site correctly says "pre-release" instead of "1-click install". |
| P1, P3–P6, P8–P12, P15, P18, P20, P21, P24 | Tests, error taxonomy, logging policy, i18n, accessibility pass, auto-update, telemetry opt-in, and similar | Real work, none of it blocking, all of it better done against a codebase that compiles in CI first |
| **P23** | The directory name `mylo frontend/` contains a space, which breaks tooling in small ways forever | **Deliberately not renamed.** Vercel's *Root Directory* setting points at this exact path; renaming it here would break the production deploy the moment it was pushed. Rename it and update Vercel's project settings in the same change — see below. |

### Renaming `mylo frontend/` safely, when you want to

```bash
git mv "mylo frontend" mylo-site
# then, before pushing: Vercel → Project → Settings → Build & Deployment
#                     → Root Directory → mylo-site
```
Also update `working-directory: mylo frontend` in `.github/workflows/ci.yml` and
the paths in `README.md`. Doing it in one commit keeps `main` deployable.

---

## The honest bottom line

The web layers of both applications are fixed and provably build. The marketing
site no longer says anything the repository cannot back up, which was the most
serious problem in the original audit — false security and compliance claims are
worse than missing features.

The Rust core is *substantially rewritten and unverified*. Push this branch and
let CI compile it on Windows and macOS; treat the first red run as the real
to-do list rather than a setback. Nothing else meaningful can be validated until
the crate compiles.
