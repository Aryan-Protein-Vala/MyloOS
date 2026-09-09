export interface Env {
  ANTHROPIC_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { license_key, model_type, system_prompt, user_prompt, base64_image } = await request.json() as any;

      // Mock License Validation
      if (!license_key || (license_key !== 'pro-123' && license_key !== 'elite-123')) {
        return new Response(JSON.stringify({ error: 'Invalid or missing License Key.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const model = model_type === 'do' 
        ? 'anthropic.claude-sonnet-4-5-20250929-v1:0' 
        : 'claude-haiku-4-5-20251001'; // 'ask' or default

      // Call Anthropic API
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY || 'mock-key',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1024,
          system: system_prompt,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: user_prompt },
                ...(base64_image ? [{
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64_image
                  }
                }] : [])
              ]
            }
          ]
        })
      });

      if (!anthropicRes.ok) {
        const err = await anthropicRes.text();
        console.error('Anthropic API Error:', err);
        return new Response(JSON.stringify({ error: `Anthropic API error: ${anthropicRes.status}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await anthropicRes.json() as any;
      const text = data.content?.[0]?.text || 'No response generated.';

      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
