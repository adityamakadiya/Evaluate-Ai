/**
 * AI Provider Abstraction
 *
 * Supports multiple LLM providers with env-based selection:
 *   AI_PROVIDER=groq      (default) — uses GROQ_API_KEY
 *   AI_PROVIDER=gemini              — uses GEMINI_API_KEY
 *   AI_PROVIDER=anthropic           — uses ANTHROPIC_API_KEY
 *
 * Each provider implements the same interface: send a prompt, get text back.
 */

// ---------- Types ----------

interface AIResponse {
  text: string;
  provider: string;
  model: string;
}

type AIProvider = 'groq' | 'gemini' | 'anthropic';

// ---------- Provider Detection ----------

const ENV_KEY_MAP: Record<AIProvider, string> = {
  groq: 'GROQ_API_KEY',
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

function getProvider(): AIProvider {
  const env = (process.env.AI_PROVIDER ?? '').toLowerCase();
  if (env === 'gemini') return 'gemini';
  if (env === 'anthropic') return 'anthropic';
  return 'groq'; // default
}

function getApiKey(provider: AIProvider): string | null {
  return process.env[ENV_KEY_MAP[provider]] ?? null;
}

// ---------- Groq Provider (Default) ----------

async function callGroq(prompt: string, apiKey: string): Promise<AIResponse> {
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMsg = result?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Groq API error: ${errorMsg}`);
  }

  const text = result?.choices?.[0]?.message?.content ?? '';

  return { text, provider: 'groq', model };
}

// ---------- Gemini Provider ----------

async function callGemini(prompt: string, apiKey: string): Promise<AIResponse> {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-lite';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    const errorMsg = result?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Gemini API error: ${errorMsg}`);
  }

  const text =
    result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return { text, provider: 'gemini', model };
}

// ---------- Anthropic Provider ----------

async function callAnthropic(prompt: string, apiKey: string): Promise<AIResponse> {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMsg = result?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Anthropic API error: ${errorMsg}`);
  }

  const text =
    result?.content?.[0]?.type === 'text' ? result.content[0].text : '';

  return { text, provider: 'anthropic', model };
}

// ---------- Public API ----------

/**
 * Send a prompt to the configured AI provider and get text back.
 * Provider is selected via AI_PROVIDER env var (default: groq).
 *
 * Returns null if no API key is configured.
 */
export async function generateText(prompt: string): Promise<AIResponse | null> {
  const provider = getProvider();
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    console.warn(`${ENV_KEY_MAP[provider]} not set — AI features disabled (provider: ${provider})`);
    return null;
  }

  switch (provider) {
    case 'groq':
      return callGroq(prompt, apiKey);
    case 'gemini':
      return callGemini(prompt, apiKey);
    case 'anthropic':
      return callAnthropic(prompt, apiKey);
  }
}

/**
 * Get the currently configured provider name (for logging/display).
 */
export function getActiveProvider(): { provider: AIProvider; configured: boolean } {
  const provider = getProvider();
  const apiKey = getApiKey(provider);
  return { provider, configured: !!apiKey };
}
