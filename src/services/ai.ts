import { DietFilter, Recipe, ScanResult, SearchResult } from '../types';
import { SCAN_SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, dietInstruction } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL;
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'claude-sonnet-5-5';
const TIMEOUT_MS = 60_000;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/** Sends one message to Claude, either via your proxy (recommended) or directly. */
async function callClaude(system: string, content: ContentBlock[]): Promise<string> {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) throw new Error('The API key was rejected. Check the key in your .env file.');
      if (res.status === 429) throw new Error('Too many requests right now. Wait a few seconds and try again.');
      throw new Error(`AI request failed (${res.status}). ${body.slice(0, 160)}`);
    }

    const data = await res.json();
    return (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n');
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The AI took too long to answer. Check your connection and try again.');
    if (e instanceof TypeError) throw new Error('Could not reach the AI service. Check your internet connection.');
    throw e;
  } finally {
    clearTimeout(timer);
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
      source,
    }));
}

export async function analyzeFoodImage(
  base64: string,
  mimeType: string,
  diet: DietFilter
): Promise<ScanResult> {
  const text = await callClaude(SCAN_SYSTEM_PROMPT, [
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
  const text = await callClaude(SEARCH_SYSTEM_PROMPT, [
    { type: 'text', text: `Recipe request: """${query.trim()}"""\n${dietInstruction(diet)}` },
  ]);
  const json = parseJson<any>(text);
  return {
    onTopic: json.onTopic !== false,
    message: json.message,
    recipes: normalizeRecipes(json.recipes, 'search'),
  };
}
