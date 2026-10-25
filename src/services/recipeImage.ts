import { Recipe } from '../types';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const THUMB_WIDTH = 960;
const HEADERS = { 'Api-User-Agent': 'KitchenMaster/1.0 (recipe app)' };
const cache = new Map<string, string | null>();

async function query(api: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${api}?${new URLSearchParams({ action: 'query', format: 'json', ...params })}`, {
    headers: HEADERS,
  });
  // Throw on errors (e.g. rate limits) so the miss isn't cached as "no photo".
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  return res.json();
}

const words = (text: string): string[] => text.toLowerCase().match(/[a-z]+/g) ?? [];

/** Searches Wikimedia Commons photos, preferring a file whose name mentions every word of the dish. */
async function commonsPhoto(dish: string): Promise<string | null> {
  const data = await query(COMMONS_API, {
    generator: 'search',
    gsrsearch: `${dish} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: String(THUMB_WIDTH),
  });
  const files = (Object.values(data?.query?.pages ?? {}) as any[])
    .filter((p) => /jpeg|webp/.test(p.imageinfo?.[0]?.mime ?? ''))
    .sort((a, b) => a.index - b.index);
  const wanted = words(dish);
  const match = files.find((p) => {
    const name = words(p.title);
    return wanted.every((w) => name.includes(w));
  });
  return (match ?? files[0])?.imageinfo?.[0]?.thumburl ?? null;
}

/** Returns the lead photo of the English Wikipedia article with this exact title. */
async function wikipediaPhoto(title: string): Promise<string | null> {
  const data = await query(WIKI_API, {
    titles: title,
    redirects: '1',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: String(THUMB_WIDTH),
  });
  const pages = Object.values(data?.query?.pages ?? {}) as { thumbnail?: { source: string } }[];
  const source = pages[0]?.thumbnail?.source;
  // Lead images that are PNG or SVG are usually diagrams or logos, not food photos.
  return source && /\.jpe?g/i.test(source) ? source : null;
}

/** Finds a reference photo for a recipe, or null when Wikimedia has nothing suitable. */
export async function findRecipeImage(recipe: Recipe): Promise<string | null> {
  if (recipe.imageUrl) return recipe.imageUrl;

  const dish = recipe.imageQuery || recipe.title;
  if (cache.has(dish)) return cache.get(dish) ?? null;

  try {
    const url =
      (await commonsPhoto(dish)) ||
      (await wikipediaPhoto(dish)) ||
      (recipe.imageQuery ? await commonsPhoto(recipe.title) : null);
    cache.set(dish, url);
    return url;
  } catch {
    return null;
  }
}
