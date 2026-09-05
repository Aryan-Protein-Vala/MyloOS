import { invoke } from '@tauri-apps/api/core'

export interface DoAction {
  action_type: 'click' | 'move' | 'type' | 'scroll'
  x?: number
  y?: number
  text?: string
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

/**
 * Ask Mode: returns a plain-text AI answer about the selected screen region.
 */
export async function askAi(prompt: string, base64Image: string): Promise<string> {
  const geminiKey = await getApiKey('gemini')
  const openaiKey = await getApiKey('openai')

  if (!geminiKey && !openaiKey) {
    return 'Error: Please set your Gemini or OpenAI API key in MYLO settings.'
  }

  const systemPrompt = `You are MYLO, an invisible AI overlay assistant running on the user's desktop.
You see a cropped screenshot of what the user circled.
Answer concisely (2-4 sentences max). Be direct and useful.`

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey 
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `${systemPrompt}\n\nUser question: ${prompt || 'What is this?'}` },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            }],
          }),
        }
      )
      if (!response.ok) throw new Error(`API error: ${response.statusText}`)
      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.'
    } else if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${systemPrompt}\n\nUser question: ${prompt || 'What is this?'}` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }]
        })
      })
      if (!response.ok) throw new Error(`API error: ${response.statusText}`)
      const data = await response.json()
      return data.choices?.[0]?.message?.content ?? 'No response generated.'
    }
    return 'No valid API provider.'
  } catch (err: any) {
    console.error('AI client error:', err)
    return `Error: ${err.message ?? 'Failed to contact AI'}`
  }
}

/**
 * Do Mode: analyzes the screenshot + user intent and returns a structured action.
 * Uses Gemini's native JSON mode to guarantee parseable output.
 * Returns null if the AI can't determine a safe action.
 */
export async function analyzeForDoMode(base64Image: string, userIntent: string): Promise<DoAction | null> {
  const geminiKey = await getApiKey('gemini')
  const openaiKey = await getApiKey('openai')
  if (!geminiKey && !openaiKey) return null

  const systemPrompt = `You are MYLO, an AI that controls a user's computer via approved actions.
Analyze the screenshot and the user's intent. Return ONLY a JSON object with this exact shape:
{
  "action_type": "click" | "move" | "type" | "scroll",
  "x": <integer screen X in pixels, or null>,
  "y": <integer screen Y in pixels, or null>,
  "text": <string to type, or null>,
  "description": "<one sentence: what this action will do>"
}
If you cannot safely determine an action, return: {"action_type":"none","description":"Cannot determine safe action"}`

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey 
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `${systemPrompt}\n\nUser intent: "${userIntent}"` },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )
      if (!response.ok) throw new Error(`API error ${response.statusText}`)
      const data = await response.json()
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!raw) return null
      const parsed = JSON.parse(raw) as { action_type: string; x?: number; y?: number; text?: string; description: string }
      if (parsed.action_type === 'none') return null
      return parsed as DoAction
    } else if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${systemPrompt}\n\nUser intent: "${userIntent}"` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }]
        })
      })
      if (!response.ok) throw new Error(`API error ${response.statusText}`)
      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content
      if (!raw) return null
      const parsed = JSON.parse(raw) as { action_type: string; x?: number; y?: number; text?: string; description: string }
      if (parsed.action_type === 'none') return null
      return parsed as DoAction
    }
    return null
  } catch (err) {
    console.error('Do mode AI error:', err)
    return null
  }
}
