import { DietFilter, Recipe, ScanResult, SearchResult } from '../types';
import { SCAN_SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, dietInstruction } from './prompts';

const PROVIDER = process.env.EXPO_PUBLIC_AI_PROVIDER === 'gemini' ? 'gemini' : 'claude';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL;
const MODEL =
  process.env.EXPO_PUBLIC_AI_MODEL || (PROVIDER === 'gemini' ? 'gemini-3.5-flash' : 'claude-sonnet-5-5');
// Gemini's thinking models can take well over a minute on a full recipe reply.
const TIMEOUT_MS = PROVIDER === 'gemini' ? 180_000 : 60_000;
// Used for the last retry when the main Gemini model keeps answering "busy".
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const RETRY_DELAY_MS = 1500;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

type ProviderRequest = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  readText: (data: any) => string;
};

/** Builds a Claude Messages API request, either via your proxy (recommended) or directly. */
function claudeRequest(model: string, system: string, content: ContentBlock[]): ProviderRequest {
  const url = PROXY_URL
    ? `${PROXY_URL.replace(/\/$/, '')}/v1/messages`
    : 'https://api.anthropic.com/v1/messages';

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (!PROXY_URL) {
    if (!API_KEY) {
      throw new Error(
        'No AI key configured. Add EXPO_PUBLIC_ANTHROPIC_API_KEY or EXPO_PUBLIC_PROXY_URL to your .env file and restart Expo.'
      );
    }
    headers['x-api-key'] = API_KEY;
    headers['anthropic-version'] = '2023-06-01';
    // Only needed when running the app on web (browser CORS).
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  return {
    url,
    headers,
    body: { model, max_tokens: 4096, system, messages: [{ role: 'user', content }] },
    readText: (data) =>
      (data.content ?? [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n'),
  };
}

/** Builds a Gemini generateContent request (direct only; the proxy is Claude-only). */
function geminiRequest(model: string, system: string, content: ContentBlock[]): ProviderRequest {
  if (!GEMINI_API_KEY) {
    throw new Error('No Gemini key configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file and restart Expo.');
  }

  const parts = content.map((b) =>
    b.type === 'text'
      ? { text: b.text }
      : { inlineData: { mimeType: b.source.media_type, data: b.source.data } }
  );

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      // Thinking tokens count against this limit, so leave room beyond the JSON reply.
      generationConfig: { maxOutputTokens: 16384, responseMimeType: 'application/json' },
    },
    readText: (data) =>
      (data.candidates?.[0]?.content?.parts ?? [])
        .filter((p: { text?: string; thought?: boolean }) => typeof p.text === 'string' && !p.thought)
        .map((p: { text: string }) => p.text)
        .join('\n'),
  };
}

/** Marks "server overloaded" errors, which are worth retrying. */
function busyError(): Error {
  return Object.assign(new Error('The AI service is busy right now. Wait a moment and try again.'), { busy: true });
}

/** Sends one request and returns the text reply, translating failures into friendly errors. */
async function send({ url, headers, body, readText }: ProviderRequest): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      const badKey = res.status === 401 || res.status === 403 || text.includes('API_KEY_INVALID');
      if (badKey) throw new Error('The API key was rejected. Check the key in your .env file.');
      if (res.status === 429) throw new Error('Too many requests right now. Wait a few seconds and try again.');
      // Gemini uses 503 and Claude uses 529 when the model is overloaded.
      if (res.status === 503 || res.status === 529) {
        throw busyError();
      }
      throw new Error(`AI request failed (${res.status}). ${text.slice(0, 160)}`);
    }

    return readText(await res.json());
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The AI took too long to answer. Check your connection and try again.');
    if (e instanceof TypeError) throw new Error('Could not reach the AI service. Check your internet connection.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends one message to the configured AI provider, retrying when the model is busy. */
async function callAI(system: string, content: ContentBlock[]): Promise<string> {
  const models =
    PROVIDER === 'gemini' && MODEL !== GEMINI_FALLBACK_MODEL
      ? [MODEL, MODEL, GEMINI_FALLBACK_MODEL]
      : [MODEL, MODEL, MODEL];

  for (let attempt = 0; ; attempt++) {
    const model = models[attempt];
    const request =
      PROVIDER === 'gemini' ? geminiRequest(model, system, content) : claudeRequest(model, system, content);
    try {
      return await send(request);
    } catch (e: any) {
      if (!e?.busy || attempt === models.length - 1) throw e;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
}

/** Pulls the JSON object out of the model reply, tolerating stray fences or text. */
function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The AI reply could not be read. Try again.');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Makes sure every recipe has safe defaults and a unique id. */
function normalizeRecipes(raw: any[] | undefined, source: Recipe['source']): Recipe[] {
  if (!Array.isArray(raw)) return [];
  const stamp = Date.now();
  return raw
    .filter((r) => r && typeof r.title === 'string')
    .map((r, i) => ({
      id: `${source}-${stamp}-${i}`,
      title: r.title,
      description: r.description ?? '',
      cuisine: r.cuisine ?? 'Home style',
      timeMinutes: Number(r.timeMinutes) || 30,
      difficulty: ['Easy', 'Medium', 'Hard'].includes(r.difficulty) ? r.difficulty : 'Easy',
      servings: Number(r.servings) || 2,
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: any) => ({
            name: String(ing?.name ?? ''),
            quantity: String(ing?.quantity ?? ''),
            available: ing?.available !== false,
          }))
        : [],
      steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
      tips: Array.isArray(r.tips) ? r.tips.map(String) : [],
      imageQuery: typeof r.imageQuery === 'string' && r.imageQuery.trim() ? r.imageQuery.trim() : undefined,
      source,
    }));
}

export async function analyzeFoodImage(
  base64: string,
  mimeType: string,
  diet: DietFilter
): Promise<ScanResult> {
  const text = await callAI(SCAN_SYSTEM_PROMPT, [
    { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
    {
      type: 'text',
      text: `Identify the food items in this photo and suggest recipes I can make. ${dietInstruction(diet)}`,
    },
  ]);
  const json = parseJson<any>(text);
  return {
    isFood: json.isFood !== false,
    message: json.message,
    detectedIngredients: Array.isArray(json.detectedIngredients) ? json.detectedIngredients.map(String) : [],
    recipes: normalizeRecipes(json.recipes, 'scan'),
  };
}

export async function searchRecipes(query: string, diet: DietFilter): Promise<SearchResult> {
  const text = await callAI(SEARCH_SYSTEM_PROMPT, [
    { type: 'text', text: `Recipe request: """${query.trim()}"""\n${dietInstruction(diet)}` },
  ]);
  const json = parseJson<any>(text);
  return {
    onTopic: json.onTopic !== false,
    message: json.message,
    recipes: normalizeRecipes(json.recipes, 'search'),
  };
}
