import { invoke } from '@tauri-apps/api/core'

export async function getApiKey(provider: string): Promise<string | null> {
  try {
    return await invoke('get_api_key', { provider })
  } catch (e) {
    console.error(`Failed to get API key for ${provider}:`, e)
    return null
  }
}

export async function askAi(prompt: string, base64Image: string): Promise<string> {
  const geminiKey = await getApiKey('gemini')
  
  if (!geminiKey) {
    return "Error: Please set your Gemini API key in MYLO settings."
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt || "Explain this image." },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated."
  } catch (err: any) {
    console.error("AI client error:", err)
    return `Error: ${err.message || 'Failed to contact AI provider'}`
  }
}
