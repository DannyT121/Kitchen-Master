import { Recipe } from '../types';

// Tiny in-memory hand-off between a list and the recipe detail screen.
let current: Recipe | null = null;

export const setCurrentRecipe = (r: Recipe) => {
  current = r;
};
export const getCurrentRecipe = () => current;
