import { invoke } from '@tauri-apps/api/core'

/**
 * Mirror of `DoAction` in `src-tauri/src/input_injector.rs`.
 *
 * The Rust struct is `#[serde(rename_all = "camelCase")]`, so these names must
 * be camelCase. They are hand-written rather than generated, which means
 * `tsc` cannot catch drift here: `invoke<DoAction>()` asserts a shape rather
 * than verifying one. This interface previously declared `action_type`, so
 * the approval gate rendered `undefined` for the action type on the one
 * screen whose job is telling the user what is about to happen.
 *
 * If you change a field name, change it in all three places: this interface,
 * the Rust struct, and the system prompt in `src-tauri/src/ipc.rs`. The Rust
 * test `serde_field_names_match_the_prompt` pins the names.
 */
export interface DoAction {
  /** Matches the arms accepted by `input_injector::validate`. */
  actionType: 'click' | 'doubleClick' | 'rightClick' | 'move' | 'type' | 'scroll'
  /** Global desktop X in physical pixels. Resolved in Rust from `ratioX`. */
  x?: number
  /** Global desktop Y in physical pixels. Resolved in Rust from `ratioY`. */
  y?: number
  /** Ratio within the captured crop, in [0, 1]. Informational on this side. */
  ratioX?: number
  /** Ratio within the captured crop, in [0, 1]. Informational on this side. */
  ratioY?: number
  text?: string
  /** Scroll notches. Positive scrolls down. Deliberately not reusing `y`. */
  scrollAmount?: number
  /** Human-readable summary shown in the approval gate. */
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
