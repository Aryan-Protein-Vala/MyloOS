'use client'

import { useCallback, useEffect, useState } from 'react'
import { MousePointer2, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { PencilLoop } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'

type Provider = 'gemini' | 'openai'

interface ShortcutInfo {
  action: string
  label: string
  description: string
}

const PROVIDER_LABEL: Record<Provider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
}

const KEY_HELP: Record<Provider, string> = {
  gemini: 'Create one at aistudio.google.com/apikey',
  openai: 'Create one at platform.openai.com/api-keys',
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default function AppDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<Provider>('gemini')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedProviders, setSavedProviders] = useState<Provider[]>([])

  /**
   * Shortcuts and platform come from the backend.
   *
   * They used to be derived from `navigator.userAgent` inline in the render
   * body. This is a static export, so Next evaluates that during prerender in
   * Node — where the user agent is "Node.js/22". The shipped HTML therefore
   * always claimed "PC"/"Ctrl" and then mismatched on hydration on every Mac.
   * The backend knows both the real OS and the shortcuts that actually got
   * registered, so it is the only honest source for either.
   */
  const [shortcuts, setShortcuts] = useState<ShortcutInfo[]>([])
  const [platform, setPlatform] = useState<string | null>(null)

  const refreshSaved = useCallback(() => {
    if (!isTauri()) return
    invoke<Provider[]>('list_saved_providers').then(setSavedProviders).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    invoke<ShortcutInfo[]>('get_shortcuts').then(setShortcuts).catch(console.error)
    invoke<string>('get_platform').then(setPlatform).catch(console.error)
    refreshSaved()
  }, [refreshSaved])

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setStatus({ type: 'error', msg: 'Enter a key first.' })
      return
    }
    if (!isTauri()) {
      setStatus({ type: 'error', msg: 'Not running inside MYLO, so there is nowhere to save.' })
      return
    }

    setSaving(true)
    setStatus(null)
    try {
      // This command returns a Result. A failure to reach the OS keychain now
      // surfaces here instead of being swallowed and reported as success.
      await invoke('save_api_key', { provider, key: trimmed })
      setApiKey('')
      setStatus({
        type: 'success',
        msg: `${PROVIDER_LABEL[provider]} key saved to your ${
          platform === 'macos' ? 'macOS Keychain' : 'Windows Credential Manager'
        }.`,
      })
      refreshSaved()
      setTimeout(() => setStatus(null), 5000)
    } catch (e) {
      setStatus({ type: 'error', msg: `Could not save: ${String(e)}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!isTauri()) return
    try {
      await invoke('delete_api_key', { provider })
      setStatus({ type: 'success', msg: `${PROVIDER_LABEL[provider]} key removed.` })
      refreshSaved()
      setTimeout(() => setStatus(null), 4000)
    } catch (e) {
      setStatus({ type: 'error', msg: `Could not remove the key: ${String(e)}` })
    }
  }

  const hasKey = savedProviders.includes(provider)

  return (
    <main className="shell py-12">
      <nav className="nav mb-12">
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span>
            <strong>MYLO</strong>
            <small>[os-native engine]</small>
          </span>
        </div>
        <div className="nav-actions">
          <div className="status-wrap">
            <div className="status">Agent active</div>
            <PencilLoop />
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* ── BYOK ─────────────────────────────────────────────────────── */}
        <section className="mode-panel">
          <div className="mode-text">
            <span className="eyebrow">BYOK SETUP</span>
            <h3>Bring your own key</h3>
            <p>
              Your key is stored in your operating system&rsquo;s credential store — Keychain on
              macOS, Credential Manager on Windows. It never leaves your device except in requests
              you make directly to the provider you chose.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex gap-4 mb-2">
                {(['gemini', 'openai'] as Provider[]).map((p) => (
                  <button
                    key={p}
                    className={`mode-tab ${provider === p ? 'active' : ''}`}
                    onClick={() => {
                      setProvider(p)
                      setStatus(null)
                    }}
                  >
                    {p === 'gemini' ? <Sparkles size={16} /> : <MousePointer2 size={16} />}
                    {PROVIDER_LABEL[p]}
                    {savedProviders.includes(p) && <span title="Key saved"> ✓</span>}
                  </button>
                ))}
              </div>

              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  hasKey
                    ? `Replace your saved ${PROVIDER_LABEL[provider]} key`
                    : `Enter your ${PROVIDER_LABEL[provider]} key`
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveKey()
                }}
                className="w-full p-4 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[4px_4px_0_var(--ink)] focus:outline-none focus:ring-4 focus:ring-blue-500 font-mono text-sm rounded-md"
              />
              <small className="font-mono text-xs opacity-60">{KEY_HELP[provider]}</small>

              <div className="flex gap-3 mt-2">
                <button className="ink-button" onClick={handleSaveKey} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving…' : 'Save securely'}
                </button>
                {hasKey && (
                  <button
                    className="ink-button"
                    onClick={handleDeleteKey}
                    title={`Remove the stored ${PROVIDER_LABEL[provider]} key`}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>

              {status && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-4 flex items-center justify-between gap-2 font-mono text-sm p-3 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--ink)] ${
                    status.type === 'error' ? 'text-red-600' : 'text-green-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={16} /> {status.msg}
                  </span>
                  {status.type === 'error' && (
                    <button
                      className="text-xs underline opacity-60 hover:opacity-100"
                      onClick={() => setStatus(null)}
                    >
                      dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Shortcuts ────────────────────────────────────────────────── */}
        <section className="mode-panel blue">
          <div className="mode-text">
            <span className="eyebrow">SHORTCUTS</span>
            <h3>Global shortcuts</h3>
            <p>
              These work anywhere
              {platform ? ` on your ${platform === 'macos' ? 'Mac' : 'PC'}` : ''}, whether or not
              MYLO has focus.
            </p>

            {shortcuts.length === 0 ? (
              <p className="mt-6 font-mono text-sm opacity-60">
                Loading the registered shortcuts…
              </p>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {shortcuts.map((s) => (
                  <li key={s.action}>
                    <kbd className="font-mono font-bold border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-1 shadow-[2px_2px_0_var(--ink)]">
                      {s.label}
                    </kbd>
                    <span className="ml-3 text-sm">{s.description}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10 p-5 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[5px_5px_0_var(--ink)]">
              <b className="block mb-2">Before Do Mode works</b>
              <p className="text-sm">
                {platform === 'macos' ? (
                  <>
                    macOS needs two permissions. Open{' '}
                    <b>System Settings › Privacy &amp; Security</b> and enable MYLO under both{' '}
                    <b>Screen &amp; System Audio Recording</b> and <b>Accessibility</b>, then
                    restart MYLO.
                  </>
                ) : platform === 'windows' ? (
                  <>
                    Nothing to configure. Screen capture needs Windows 10 version 2004 or newer for
                    the overlay to stay hidden from screen shares.
                  </>
                ) : (
                  <>Screen capture and input control require OS permissions on first use.</>
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
