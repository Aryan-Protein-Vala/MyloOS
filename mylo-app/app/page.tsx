'use client'

import { useEffect, useState } from 'react'
import { Sparkles, MousePointer2, Mic2, Save, ShieldCheck } from 'lucide-react'
import { RoughArrow, PencilLoop } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'

export default function AppDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isMac = typeof navigator !== 'undefined' ? navigator.userAgent.includes('Mac') : true

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      invoke<string>('get_active_provider')
        .then((p) => {
          if (p === 'gemini' || p === 'openai') setProvider(p)
        })
        .catch(console.error)
    }
  }, [])

  const handleSelectProvider = async (p: 'gemini' | 'openai') => {
    setProvider(p)
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      try {
        await invoke('set_active_provider', { provider: p })
      } catch (err) {
        console.error('Failed to set active provider:', err)
      }
    }
  }

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a key first.' })
      return
    }
    if (!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      setStatus({ type: 'error', msg: 'Not running in Tauri. Cannot save.' })
      return
    }
    setSaving(true)
    try {
      await invoke('save_api_key', { provider, key: apiKey })
      setApiKey('')
      setStatus({ type: 'success', msg: 'Key saved to encrypted local store.' })
      setTimeout(() => setStatus(null), 4000)
    } catch (e) {
      // Errors persist until the user clicks dismiss — don't auto-hide
      setStatus({ type: 'error', msg: `Failed to save: ${e}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="shell py-12">
      <nav className="nav mb-12">
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span><strong>MYLO</strong><small>[os-native engine]</small></span>
        </div>
        <div className="nav-actions">
          <div className="status-wrap">
            <div className="status">
               Agent Active
            </div>
            <PencilLoop />
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* BYOK Settings Panel */}
        <section className="mode-panel">
          <div className="mode-text">
            <span className="eyebrow">BYOK SETUP</span>
            <h3>Bring Your Own Key</h3>
            <p>Connect your preferred model. Your key is stored in an encrypted local store that never leaves your device.</p>
            
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex gap-4 mb-2">
                <button 
                  className={`mode-tab ${provider === 'gemini' ? 'active' : ''}`}
                  onClick={() => handleSelectProvider('gemini')}
                >
                  <Sparkles size={16} /> Gemini
                </button>
                <button 
                  className={`mode-tab ${provider === 'openai' ? 'active' : ''}`}
                  onClick={() => handleSelectProvider('openai')}
                >
                  <MousePointer2 size={16} /> OpenAI
                </button>
              </div>

              <div className="relative">
                <input 
                  type="password"
                  placeholder={`Enter your ${provider === 'gemini' ? 'Gemini API' : 'OpenAI'} Key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-4 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[4px_4px_0_var(--ink)] focus:outline-none focus:ring-4 focus:ring-blue-500 font-mono text-sm rounded-md"
                />
              </div>

              <button className="ink-button mt-4" onClick={handleSaveKey} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Securely'}
              </button>

              {status && (
                <div className={`mt-4 flex items-center justify-between gap-2 font-mono text-sm p-3 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--ink)] ${
                  status.type === 'error' ? 'text-red-600' : 'text-[var(--green)]'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} /> {status.msg}
                  </div>
                  {status.type === 'error' && (
                    <button className="text-xs underline opacity-60 hover:opacity-100" onClick={() => setStatus(null)}>dismiss</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mode-panel blue">
          <div className="mode-text">
            <span className="eyebrow">SHORTCUTS</span>
            <h3>Quick Actions</h3>
            <p>Use these global shortcuts from anywhere on your {mounted ? (isMac ? 'Mac' : 'PC') : 'computer'}.</p>
            <ul className="mt-6">
              <li><strong>{mounted ? (isMac ? 'Cmd' : 'Ctrl') : 'Cmd'} + Shift + Space</strong>: Toggle Ask Mode (draw & ask)</li>
              <li><strong>{mounted ? (isMac ? 'Cmd' : 'Ctrl') : 'Cmd'} + Shift + D</strong>: Summon ghost cursor / Do mode</li>
              <li><strong>Esc (Double tap)</strong>: Hide all overlays</li>
            </ul>

            <div className="relative mt-12 p-6 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[5px_5px_0_var(--ink)] rotate-1">
              <div className="absolute top-2 right-2 text-xs font-mono text-gray-500">Preview</div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--ink)] bg-[var(--yellow)] flex items-center justify-center">
                  <Mic2 size={20} />
                </div>
                <div>
                  <p className="font-bold">Listening...</p>
                  <p className="text-sm font-mono opacity-70">&quot;What does this error mean?&quot;</p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-8 w-32 text-red-500 rotate-[-15deg] pointer-events-none">
                <RoughArrow />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
