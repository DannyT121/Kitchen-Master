import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const KEY = 'kitchen-master:favorites:v1';

export async function getFavorites(): Promise<Recipe[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Recipe[]) : [];
  } catch {
    return [];
  }
}

async function write(list: Recipe[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function isFavorite(id: string): Promise<boolean> {
  return (await getFavorites()).some((r) => r.id === id);
}

export async function addFavorite(recipe: Recipe): Promise<void> {
  const list = await getFavorites();
  if (!list.some((r) => r.id === recipe.id)) await write([recipe, ...list]);
}

export async function removeFavorite(id: string): Promise<void> {
  await write((await getFavorites()).filter((r) => r.id !== id));
}
