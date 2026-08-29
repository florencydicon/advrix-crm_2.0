/**
 * Thin, provider-agnostic AI client (OpenAI-compatible chat-completions API).
 *
 * Configure via environment variables:
 *   AI_API_KEY   - provider API key. When missing every AI feature is disabled
 *                  and the UI shows a "not configured" message (no crash).
 *   AI_BASE_URL  - provider endpoint, defaults to https://api.openai.com/v1
 *   AI_MODEL     - model name, defaults to gpt-4o-mini
 */
const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function aiBase(): string {
  return (process.env.AI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
}

function aiModel(): string {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

export interface AiResult {
  text: string;
  model: string;
}

/** Runs a chat completion and returns the trimmed text reply. */
export async function aiComplete(system: string, user: string, maxTokens = 1200): Promise<AiResult> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI is not configured. Add AI_API_KEY to your environment first.");

  const res = await fetch(`${aiBase()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: aiModel(),
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim?.() ?? "";
  if (!text) throw new Error("AI returned an empty response.");
  return { text, model: aiModel() };
}