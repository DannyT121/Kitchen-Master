export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface RecipeIngredient {
  name: string;
  quantity: string;
  /** true when the ingredient was seen in the photo or is a pantry staple */
  available?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  timeMinutes: number;
  difficulty: Difficulty;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tips?: string[];
  /** English Wikipedia article name of the closest well-known dish, used to find a photo */
  imageQuery?: string;
  /** Photo found for this recipe, kept so saved recipes don't look it up again */
  imageUrl?: string;
  source: 'scan' | 'search';
}

export interface ScanResult {
  isFood: boolean;
  message?: string;
  detectedIngredients: string[];
  recipes: Recipe[];
}

export interface SearchResult {
  onTopic: boolean;
  message?: string;
  recipes: Recipe[];
}

export type DietFilter = 'any' | 'vegetarian' | 'vegan' | 'quick' | 'high-protein';

export const DIET_OPTIONS: { key: DietFilter; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'quick', label: 'Under 30 min' },
  { key: 'high-protein', label: 'High protein' },
];
