// Thin server-side Gemini client. The key never leaves the server.

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'not_configured' | 'rejected' | 'timeout' | 'empty' | 'unavailable'
  }
}

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * @param {{ system?: string, turns: Array<{ role: 'user' | 'model', text: string }>, maxTokens?: number, temperature?: number }} opts
 */
export async function generate({ system, turns, maxTokens = 600, temperature = 0.4 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('not_configured', 'GEMINI_API_KEY is not set');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: controller.signal,
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
  } catch (err) {
    throw new GeminiError(err.name === 'AbortError' ? 'timeout' : 'unavailable', err.message);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Gemini error', res.status, body.slice(0, 300));
    throw new GeminiError(res.status === 400 || res.status === 403 || res.status === 401 ? 'rejected' : 'unavailable', `Gemini ${res.status}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new GeminiError('empty', 'Gemini returned no text');
  return text;
}

export function aiErrorResponse(err) {
  if (!(err instanceof GeminiError)) return null;
  const map = {
    not_configured: [503, 'The AI assistant is not set up on this deployment yet.'],
    rejected: [502, 'The AI service rejected the request. The server API key may be invalid.'],
    timeout: [504, 'The AI took too long to answer. Try again.'],
    empty: [502, 'The AI did not return an answer. Try rephrasing.'],
    unavailable: [502, 'The AI service is unavailable right now. Try again shortly.'],
  };
  const [status, message] = map[err.code] || map.unavailable;
  return { status, message, code: err.code };
}
