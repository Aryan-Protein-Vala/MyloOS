import { invoke } from '@tauri-apps/api/core'

export interface DoAction {
  actionType: 'click' | 'doubleClick' | 'rightClick' | 'move' | 'type' | 'scroll' | 'none'
  x?: number
  y?: number
  ratioX?: number
  ratioY?: number
  text?: string
  scrollAmount?: number
  description: string
}

export async function getApiKey(provider: string): Promise<string | null> {
  try {
    return await invoke('get_api_key', { provider })
  } catch (e) {
    console.error(`Failed to get API key for ${provider}:`, e)
    return null
  }
}

export async function askAi(prompt: string, base64Image: string): Promise<string> {
  try {
    return await invoke<string>('ask_ai', { prompt, base64Image })
  } catch (err) {
    console.error('AI client error:', err)
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Do Mode: analyzes the screenshot + user intent and returns a structured action.
 * Uses Gemini's native JSON mode to guarantee parseable output.
 * Returns null if the AI can't determine a safe action.
 */
export async function analyzeForDoMode(base64Image: string, userIntent: string, rect: { x: number, y: number, width: number, height: number }): Promise<DoAction | null> {
  try {
    return await invoke<DoAction | null>('analyze_for_do_mode', { base64Image, userIntent, rect })
  } catch (err) {
    console.error('Do mode AI error:', err)
    return null
  }
}
