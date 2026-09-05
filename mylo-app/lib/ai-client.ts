import { invoke } from '@tauri-apps/api/core'

export type Provider = 'gemini' | 'openai'

export type ActionType = 'click' | 'doubleClick' | 'rightClick' | 'move' | 'type' | 'scroll'

/**
 * An action to execute on the desktop.
 *
 * `x`/`y` are **global desktop physical pixels**, already translated out of
 * the model's image space by `resolveAction`. Field names are camelCase to
 * match the Rust `DoAction` struct's serde representation.
 */
export interface DoAction {
  actionType: ActionType
  x?: number | null
  y?: number | null
  text?: string | null
  scrollAmount?: number | null
  description: string
}

/** The region of the desktop a capture covers, in global physical pixels. */
export interface GlobalRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * What the model is asked to return.
 *
 * Coordinates come back as **ratios of the captured image** (0–1) rather than
 * absolute screen pixels. The model only ever sees a cropped, downscaled JPEG,
 * so it has no way of knowing where that crop sits on a 4K multi-monitor
 * desktop; asking it for absolute pixels means it guesses, and the click lands
 * somewhere arbitrary. Ratios are the only thing it can actually observe.
 */
interface ModelAction {
  actionType: ActionType | 'none'
  xRatio?: number | null
  yRatio?: number | null
  text?: string | null
  scrollAmount?: number | null
  description: string
}

/** Longest string Do Mode will type. Mirrors MAX_TYPE_LEN in input_injector.rs. */
const MAX_TYPE_LEN = 500

const GEMINI_MODEL = 'gemini-2.5-flash'
const OPENAI_MODEL = 'gpt-4o'

const REQUEST_TIMEOUT_MS = 45_000

export class AiError extends Error {}

// ─────────────────────────────────────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────────────────────────────────────

export async function getApiKey(provider: Provider): Promise<string | null> {
  try {
    return await invoke<string | null>('get_api_key', { provider })
  } catch (e) {
    console.error(`[MYLO] Could not read the ${provider} key:`, e)
    return null
  }
}

export async function listSavedProviders(): Promise<Provider[]> {
  try {
    return await invoke<Provider[]>('list_saved_providers')
  } catch {
    return []
  }
}

/**
 * Resolve which provider to use.
 *
 * Honours the user's explicit choice. The previous implementation was
 * `if (geminiKey) ... else if (openaiKey)`, which meant selecting OpenAI in the
 * dashboard did nothing whenever a Gemini key also happened to be stored.
 */
async function resolveProvider(preferred: Provider): Promise<{ provider: Provider; key: string }> {
  const preferredKey = await getApiKey(preferred)
  if (preferredKey) return { provider: preferred, key: preferredKey }

  const fallback: Provider = preferred === 'gemini' ? 'openai' : 'gemini'
  const fallbackKey = await getApiKey(fallback)
  if (fallbackKey) {
    console.warn(`[MYLO] No ${preferred} key stored; falling back to ${fallback}.`)
    return { provider: fallback, key: fallbackKey }
  }

  throw new AiError(
    'No API key found. Add a Gemini or OpenAI key in the MYLO dashboard first.',
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────────────────────────────────────────

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      // Surface the provider's own message — "400 Bad Request" tells the user
      // nothing, whereas "API key not valid" tells them exactly what to fix.
      const detail = await response.text().catch(() => '')
      let message = `${response.status} ${response.statusText}`
      try {
        const parsed = JSON.parse(detail)
        message = parsed?.error?.message ?? message
      } catch {
        if (detail) message = detail.slice(0, 300)
      }
      throw new AiError(message)
    }

    return await response.json()
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AiError(`The model did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`)
    }
    throw new AiError(e instanceof Error ? e.message : 'Could not reach the model provider.')
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ask Mode
// ─────────────────────────────────────────────────────────────────────────────

const ASK_SYSTEM_PROMPT = `You are MYLO, an invisible AI overlay on the user's desktop.
You are shown a cropped screenshot of the region the user circled.
Answer in at most four sentences. Be direct and concrete. If the image is
unreadable or does not contain enough context, say so plainly instead of guessing.`

/** Returns a plain-text answer about the captured region. */
export async function askAi(
  prompt: string,
  base64Image: string,
  preferred: Provider = 'gemini',
): Promise<string> {
  const { provider, key } = await resolveProvider(preferred)
  const question = prompt.trim() || 'What is this?'

  if (provider === 'gemini') {
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      { 'x-goog-api-key': key },
      {
        contents: [
          {
            parts: [
              { text: `${ASK_SYSTEM_PROMPT}\n\nUser question: ${question}` },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
      },
    )
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'The model returned no answer.'
  }

  const data = await postJson(
    'https://api.openai.com/v1/chat/completions',
    { Authorization: `Bearer ${key}` },
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${ASK_SYSTEM_PROMPT}\n\nUser question: ${question}` },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
    },
  )
  return data?.choices?.[0]?.message?.content ?? 'The model returned no answer.'
}

// ─────────────────────────────────────────────────────────────────────────────
// Do Mode
// ─────────────────────────────────────────────────────────────────────────────

const DO_SYSTEM_PROMPT = `You are MYLO, an assistant that proposes ONE desktop action.
You are shown a cropped screenshot and the user's intent.

Return ONLY a JSON object:
{
  "actionType": "click" | "doubleClick" | "rightClick" | "move" | "type" | "scroll" | "none",
  "xRatio": <number 0-1, horizontal position WITHIN THE IMAGE, or null>,
  "yRatio": <number 0-1, vertical position WITHIN THE IMAGE, or null>,
  "text": <string to type, or null>,
  "scrollAmount": <integer notches, positive scrolls down, or null>,
  "description": "<one plain sentence describing exactly what will happen>"
}

Rules:
- xRatio/yRatio are fractions of the IMAGE you were given, NOT screen pixels.
  0,0 is its top-left corner and 1,1 is its bottom-right.
- Point at the CENTRE of the target control.
- Never propose an action that deletes data, sends a message, makes a payment,
  or is otherwise irreversible. Return "none" instead.
- If you are not confident about the target, return "none".`

/**
 * Map a model response onto the real desktop.
 *
 * `rect` is the region that was actually captured, in global desktop physical
 * pixels, so a ratio inside the image becomes an absolute point on screen.
 * This is the step that makes Do Mode's coordinates mean anything.
 */
export function resolveAction(model: ModelAction, rect: GlobalRect): DoAction | null {
  if (!model || model.actionType === 'none' || !model.actionType) return null

  const needsPoint = ['click', 'doubleClick', 'rightClick', 'move'].includes(model.actionType)

  let x: number | null = null
  let y: number | null = null

  if (typeof model.xRatio === 'number' && typeof model.yRatio === 'number') {
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    x = Math.round(rect.x + clamp(model.xRatio) * rect.width)
    y = Math.round(rect.y + clamp(model.yRatio) * rect.height)
  }

  if (needsPoint && (x === null || y === null)) {
    console.warn('[MYLO] Model proposed a pointer action without coordinates; discarding.')
    return null
  }

  if (model.actionType === 'type') {
    const text = (model.text ?? '').slice(0, MAX_TYPE_LEN)
    if (!text) return null
    return {
      actionType: 'type',
      text,
      x,
      y,
      scrollAmount: null,
      description: model.description || `Type "${text.slice(0, 60)}"`,
    }
  }

  if (model.actionType === 'scroll') {
    const amount = Math.trunc(model.scrollAmount ?? 0)
    if (!amount) return null
    return {
      actionType: 'scroll',
      scrollAmount: amount,
      x,
      y,
      text: null,
      description: model.description || `Scroll ${amount > 0 ? 'down' : 'up'}`,
    }
  }

  return {
    actionType: model.actionType,
    x,
    y,
    text: null,
    scrollAmount: null,
    description: model.description || `${model.actionType} at (${x}, ${y})`,
  }
}

function parseModelJson(raw: string | undefined): ModelAction | null {
  if (!raw) return null
  try {
    // Models occasionally wrap JSON in a ```json fence despite being told not to.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
    return JSON.parse(cleaned) as ModelAction
  } catch (e) {
    console.error('[MYLO] Model returned unparseable JSON:', raw, e)
    return null
  }
}

/** Ask the model for one action and translate it into desktop coordinates. */
export async function analyzeForDoMode(
  base64Image: string,
  userIntent: string,
  rect: GlobalRect,
  preferred: Provider = 'gemini',
): Promise<DoAction | null> {
  const { provider, key } = await resolveProvider(preferred)
  const prompt = `${DO_SYSTEM_PROMPT}\n\nUser intent: "${userIntent}"`

  let raw: string | undefined

  if (provider === 'gemini') {
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      { 'x-goog-api-key': key },
      {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      },
    )
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  } else {
    const data = await postJson(
      'https://api.openai.com/v1/chat/completions',
      { Authorization: `Bearer ${key}` },
      {
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
      },
    )
    raw = data?.choices?.[0]?.message?.content
  }

  const parsed = parseModelJson(raw)
  if (!parsed) return null

  return resolveAction(parsed, rect)
}
