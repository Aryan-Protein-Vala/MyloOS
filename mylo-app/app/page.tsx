'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, MousePointer2, Mic, Volume2, Save, ShieldCheck, Check } from 'lucide-react'
import { RoughArrow, PencilLoop } from '@/components/ui/design-system'
import { invoke } from '@tauri-apps/api/core'

type Provider = 'gemini' | 'openai' | 'groq' | 'sarvam'

export default function AppDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<Provider>('gemini')
  const [activeReasoning, setActiveReasoning] = useState<'gemini' | 'openai'>('gemini')
  const [savedProviders, setSavedProviders] = useState<string[]>([])
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Permissions State
  const [permissions, setPermissions] = useState<{ accessibility: boolean, screen_recording: boolean }>({
    accessibility: true,
    screen_recording: true
  })
  
  const isMac = typeof navigator !== 'undefined' ? navigator.userAgent.includes('Mac') : true

  const refreshSaved = async () => {
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      try {
        const list = await invoke<string[]>('list_saved_providers')
        setSavedProviders(list || [])
      } catch (err) {
        console.error('Failed to list saved providers:', err)
      }
    }
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      invoke<string>('get_active_provider')
        .then((p) => {
          if (p === 'openai' || p === 'gemini') {
            setActiveReasoning(p)
          }
        })
        .catch(console.error)

      refreshSaved().catch(console.error)
      
      // Permissions poll loop
      const checkPerms = () => {
        invoke<{accessibility: boolean, screen_recording: boolean}>('check_permissions')
          .then(setPermissions)
          .catch(console.error)
      }
      checkPerms()
      const interval = setInterval(checkPerms, 2000)
      return () => clearInterval(interval)
    }
  }, [])

  const handleSelectProvider = (p: Provider) => {
    setProvider(p)
    setApiKey('')
  }

  const handleSetActiveReasoning = async (llm: 'gemini' | 'openai') => {
    setActiveReasoning(llm)
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) {
      try {
        await invoke('set_active_provider', { provider: llm })
        setStatus({ type: 'success', msg: `Active reasoning model switched to ${llm.toUpperCase()}.` })
        setTimeout(() => setStatus(null), 3000)
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
      await invoke('save_api_key', { provider, key: apiKey.trim() })
      setApiKey('')
      await refreshSaved()
      setStatus({ type: 'success', msg: `${provider.toUpperCase()} key saved securely to local encrypted store.` })
      setTimeout(() => setStatus(null), 4000)
    } catch (e) {
      setStatus({ type: 'error', msg: `Failed to save: ${e}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__) return
    setDeleting(true)
    try {
      await invoke('delete_api_key', { provider })
      await refreshSaved()
      setStatus({ type: 'success', msg: `${provider.toUpperCase()} key removed from secure storage.` })
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus({ type: 'error', msg: `Failed to delete: ${e}` })
    } finally {
      setDeleting(false)
    }
  }

  const getPlaceholder = () => {
    switch (provider) {
      case 'gemini': return 'Enter Gemini API Key (AI Reasoning)'
      case 'openai': return 'Enter OpenAI API Key (AI Reasoning)'
      case 'groq': return 'Enter Groq API Key (Fast Whisper STT)'
      case 'sarvam': return 'Enter Sarvam AI API Key (Voice TTS)'
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

      <section className="shell pt-12 pb-8">
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 54px)', maxWidth: '800px', lineHeight: 1 }}>
          Motion. <em>Your Live Operator</em>.
        </h1>
        <p className="lede">
          Connect your API keys below to give MYLO agency over your computer. 
        </p>
        
        <div className="flex gap-4 mt-6">
          <Link href="/orchestrator" className="ink-button bg-[var(--blue)] text-white text-sm px-6 py-2 shadow-[4px_4px_0_var(--ink)]">
            Open Background Orchestrator
          </Link>
        </div>
      </section>

      {/* Permissions Onboarding */}
      {(!permissions.accessibility || !permissions.screen_recording) && (
        <section className="mode-panel bg-[var(--yellow)] mb-12 border-[3px] border-[var(--ink)]">
          <div className="mode-text w-full">
            <span className="eyebrow flex items-center gap-2"><ShieldCheck size={16} /> REQUIRED SETUP</span>
            <h3>Grant System Permissions</h3>
            <p className="opacity-80">MYLO needs OS-level permissions to see your screen and inject physics (mouse clicks). He cannot operate without these.</p>
            
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white border-2 border-[var(--ink)] p-4 rounded-xl shadow-[4px_4px_0_var(--ink)]">
                <div>
                  <h4 className="font-bold font-mono m-0 flex items-center gap-2">
                    Accessibility 
                    {permissions.accessibility && <Check size={16} className="text-green-600" />}
                  </h4>
                  <p className="text-sm opacity-70 m-0">Required for hardware mouse clicking.</p>
                </div>
                {!permissions.accessibility ? (
                  <button 
                    onClick={() => invoke('request_accessibility_permissions')}
                    className="ink-button bg-[var(--red)] text-white text-xs px-4 py-2 hover:scale-105"
                  >
                    Grant Access
                  </button>
                ) : (
                  <span className="text-green-600 font-bold font-mono text-sm px-4">GRANTED</span>
                )}
              </div>

              <div className="flex items-center justify-between bg-white border-2 border-[var(--ink)] p-4 rounded-xl shadow-[4px_4px_0_var(--ink)]">
                <div>
                  <h4 className="font-bold font-mono m-0 flex items-center gap-2">
                    Screen Recording
                    {permissions.screen_recording && <Check size={16} className="text-green-600" />}
                  </h4>
                  <p className="text-sm opacity-70 m-0">Required for MYLO's Vision engine.</p>
                </div>
                {!permissions.screen_recording ? (
                  <button 
                    onClick={() => invoke('request_screen_recording_permissions')}
                    className="ink-button bg-[var(--red)] text-white text-xs px-4 py-2 hover:scale-105"
                  >
                    Grant Access
                  </button>
                ) : (
                  <span className="text-green-600 font-bold font-mono text-sm px-4">GRANTED</span>
                )}
              </div>
            </div>
            <p className="text-xs opacity-60 mt-4 font-mono">You may need to restart the app after granting permissions in System Settings.</p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* BYOK Settings Panel */}
        <section className="mode-panel">
          <div className="mode-text">
            <span className="eyebrow">BYOK SETUP</span>
            <h3>Bring Your Own Keys</h3>
            <p>Connect your models and services. Keys are stored securely in your OS keychain and never leave your machine.</p>
            
            <div className="mt-6 flex flex-col gap-4">
              {/* Reasoning Engine Choice */}
              <div>
                <span className="text-xs font-mono font-bold uppercase text-gray-600 block mb-1">1. Reasoning Engine (LLM)</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`mode-tab flex items-center justify-between ${provider === 'gemini' ? 'active' : ''}`}
                    onClick={() => handleSelectProvider('gemini')}
                  >
                    <span className="flex items-center gap-1.5"><Sparkles size={14} /> Gemini</span>
                    <div className="flex items-center gap-1">
                      {activeReasoning === 'gemini' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">ACTIVE</span>}
                      {savedProviders.includes('gemini') && <Check size={12} className="text-green-600" />}
                    </div>
                  </button>
                  <button 
                    className={`mode-tab flex items-center justify-between ${provider === 'openai' ? 'active' : ''}`}
                    onClick={() => handleSelectProvider('openai')}
                  >
                    <span className="flex items-center gap-1.5"><MousePointer2 size={14} /> OpenAI</span>
                    <div className="flex items-center gap-1">
                      {activeReasoning === 'openai' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">ACTIVE</span>}
                      {savedProviders.includes('openai') && <Check size={12} className="text-green-600" />}
                    </div>
                  </button>
                </div>
                {(provider === 'gemini' || provider === 'openai') && activeReasoning !== provider && (
                  <button 
                    className="text-xs text-blue-600 underline font-mono mt-1 hover:text-blue-800"
                    onClick={() => handleSetActiveReasoning(provider)}
                  >
                    Set {provider.toUpperCase()} as active reasoning model
                  </button>
                )}
              </div>

              {/* Speech & Voice Services */}
              <div>
                <span className="text-xs font-mono font-bold uppercase text-gray-600 block mb-1">2. Speech & Voice Pipeline</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`mode-tab flex items-center justify-between ${provider === 'groq' ? 'active' : ''}`}
                    onClick={() => handleSelectProvider('groq')}
                  >
                    <span className="flex items-center gap-1.5"><Mic size={14} /> Groq (STT)</span>
                    {savedProviders.includes('groq') && <Check size={12} className="text-green-600" />}
                  </button>
                  <button 
                    className={`mode-tab flex items-center justify-between ${provider === 'sarvam' ? 'active' : ''}`}
                    onClick={() => handleSelectProvider('sarvam')}
                  >
                    <span className="flex items-center gap-1.5"><Volume2 size={14} /> Sarvam (TTS)</span>
                    {savedProviders.includes('sarvam') && <Check size={12} className="text-green-600" />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input 
                  type="password"
                  placeholder={getPlaceholder()}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-4 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[4px_4px_0_var(--ink)] focus:outline-none focus:ring-4 focus:ring-blue-500 font-mono text-sm rounded-md"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button className="ink-button flex-1" onClick={handleSaveKey} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Securely'}
                </button>
                {savedProviders.includes(provider) && (
                  <button 
                    className="border-2 border-red-500 text-red-600 hover:bg-red-50 px-3 py-2 text-xs font-mono font-bold rounded shadow-[2px_2px_0_#ef4444]" 
                    onClick={handleDeleteKey} 
                    disabled={deleting}
                  >
                    {deleting ? 'Removing...' : 'Remove Key'}
                  </button>
                )}
              </div>

              {status && (
                <div className={`mt-2 flex items-center justify-between gap-2 font-mono text-sm p-3 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--ink)] ${
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
            <ul className="mt-6 space-y-2">
              <li><strong>Ctrl + {mounted ? (isMac ? 'Option' : 'Alt') : 'Alt'} + Space</strong>: Hold to Push-to-Talk (Voice Commands)</li>
              <li><strong>{mounted ? (isMac ? 'Cmd' : 'Ctrl') : 'Cmd'} + Shift + Space</strong>: Toggle Ask Mode (draw & ask)</li>
              <li><strong>{mounted ? (isMac ? 'Cmd' : 'Ctrl') : 'Cmd'} + Shift + D</strong>: Summon ghost cursor / Do mode</li>
              <li><strong>Esc (Double tap)</strong>: Hide all overlays / Abort agent actions</li>
            </ul>

            <div className="relative mt-8 p-6 border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[5px_5px_0_var(--ink)] rotate-1">
              <div className="absolute top-2 right-2 text-xs font-mono text-gray-500">Mini-Jarvis</div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--ink)] bg-[var(--yellow)] flex items-center justify-center">
                  <Mic size={20} />
                </div>
                <div>
                  <p className="font-bold">Hold Ctrl+{mounted ? (isMac ? 'Option' : 'Alt') : 'Alt'}+Space to speak</p>
                  <p className="text-sm font-mono opacity-70">&quot;Open Spotify and play Billie Jean&quot;</p>
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
