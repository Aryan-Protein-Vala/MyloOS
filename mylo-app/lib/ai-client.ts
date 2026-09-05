import { invoke } from '@tauri-apps/api/core'

export interface DoAction {
  action_type: 'click' | 'move' | 'type' | 'scroll'
  x?: number
  y?: number
  text?: string
  description: string
}

export interface AiResponse {
  mode: 'ask' | 'do'
  /** Plain text answer (for ask mode) */
  answer?: string
  /** Structured action to execute (for do mode) */
  action?: DoAction
}

export async function getApiKey(provider: string): Promise<string | null> {
  try {
    return await invoke('get_api_key', { provider })
  } catch (e) {
    console.error(`Failed to get API key for ${provider}:`, e)
    return null
  }
}

/**
 * Ask Mode: returns a plain text answer about the selected screen region.
 */
export async function askAi(prompt: string, base64Image: string): Promise<string> {
  const geminiKey = await getApiKey('gemini')

  if (!geminiKey) {
    return 'Error: Please set your Gemini API key in MYLO settings (Alt+click the tray icon).'
  }

  const systemPrompt = `You are MYLO, an invisible AI overlay assistant running on the user's desktop.
You see a cropped screenshot of what the user circled.
Answer concisely (2-4 sentences max). Be direct and useful.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\nUser question: ${prompt || 'What is this?'}` },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.'
  } catch (err: any) {
    console.error('AI client error:', err)
    return `Error: ${err.message ?? 'Failed to contact AI'}`
  }
}

/**
 * Do Mode: analyzes the screenshot and returns a structured action for the user to approve.
 * Returns null if the AI can't determine a safe action.
 */
export async function analyzeForDoMode(base64Image: string, userIntent: string): Promise<DoAction | null> {
  const geminiKey = await getApiKey('gemini')
  if (!geminiKey) return null

  const systemPrompt = `You are MYLO, an AI that controls a user's computer via approved actions.
Analyze the screenshot and the user's intent. Return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "action_type": "click" | "move" | "type" | "scroll",
  "x": <number, physical screen X in pixels, or null>,
  "y": <number, physical screen Y in pixels, or null>,
  "text": <string to type, or null>,
  "description": "<human-readable 1-sentence explanation of what this action will do>"
}
If you cannot safely determine an action, return: {"action_type":"none","description":"Cannot determine safe action"}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\nUser intent: "${userIntent}"` },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )

    if (!response.ok) throw new Error(`API error ${response.statusText}`)
    const data = await response.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return null
    const parsed = JSON.parse(raw) as DoAction & { action_type: string }
    if (parsed.action_type === 'none') return null
    return parsed as DoAction
  } catch (err) {
    console.error('Do mode AI error:', err)
    return null
  }
}
