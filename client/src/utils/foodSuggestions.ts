// Food suggestions based on meal category and nutritional needs

interface FoodSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  quantity: string; // e.g., "1", "100g", "2"
  per100g: boolean;
}

interface RemainingNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

// Food database organized by category
const FOOD_BY_CATEGORY: Record<string, FoodSuggestion[]> = {
  breakfast: [
    { name: '2 boiled eggs', calories: 140, protein: 12, carbs: 0.8, fats: 10, fiber: 0, quantity: '2', per100g: false },
    { name: '100g curd', calories: 98, protein: 11, carbs: 3.4, fats: 4.3, fiber: 0, quantity: '100', per100g: true },
    { name: '1 banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3.1, quantity: '1', per100g: false },
    { name: 'moong chilla', calories: 196, protein: 13.2, carbs: 18, fats: 6, fiber: 5, quantity: '100', per100g: true },
    { name: 'poha', calories: 150, protein: 3, carbs: 30, fats: 2, fiber: 2, quantity: '100', per100g: true },
    { name: 'upma', calories: 180, protein: 4, carbs: 35, fats: 3, fiber: 3, quantity: '100', per100g: true },
    { name: 'oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3, fiber: 4, quantity: '1', per100g: false },
    { name: '1 glass milk', calories: 150, protein: 8, carbs: 12, fats: 8, fiber: 0, quantity: '1', per100g: false },
    { name: 'idli', calories: 100, protein: 3, carbs: 20, fats: 0.5, fiber: 1, quantity: '100', per100g: true },
  ],
  lunch: [
    { name: '150g chicken breast', calories: 247.5, protein: 46.5, carbs: 0, fats: 5.4, fiber: 0, quantity: '150', per100g: true },
    { name: '2 roti', calories: 297, protein: 7.9, carbs: 46, fats: 9.2, fiber: 2.7, quantity: '100', per100g: true },
    { name: '200g sabji', calories: 160, protein: 5, carbs: 24, fats: 4, fiber: 6, quantity: '200', per100g: true },
    { name: '100g dal', calories: 116, protein: 6.8, carbs: 20, fats: 0.4, fiber: 7.9, quantity: '100', per100g: true },
    { name: '100g rice', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4, quantity: '100', per100g: true },
    { name: '150g paneer', calories: 397.5, protein: 27, carbs: 5.25, fats: 30, fiber: 0, quantity: '150', per100g: true },
    { name: 'palak paneer', calories: 180, protein: 12, carbs: 8, fats: 12, fiber: 4, quantity: '100', per100g: true },
    { name: 'rajma', calories: 130, protein: 8, carbs: 22, fats: 0.5, fiber: 6, quantity: '100', per100g: true },
    { name: 'chole', calories: 160, protein: 9, carbs: 25, fats: 3, fiber: 7, quantity: '100', per100g: true },
  ],
  snacks: [
    { name: '50g chana', calories: 60, protein: 4, carbs: 10, fats: 1.5, fiber: 3.5, quantity: '50', per100g: true },
    { name: '1 glass milk', calories: 150, protein: 8, carbs: 12, fats: 8, fiber: 0, quantity: '1', per100g: false },
    { name: '1 apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4.4, quantity: '1', per100g: false },
    { name: '100g yogurt', calories: 150, protein: 13, carbs: 11, fats: 4, fiber: 0, quantity: '100', per100g: true },
    { name: '1 banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3.1, quantity: '1', per100g: false },
    { name: 'paneer tikka', calories: 200, protein: 15, carbs: 5, fats: 12, fiber: 1, quantity: '100', per100g: true },
    { name: 'sprout salad', calories: 100, protein: 8, carbs: 15, fats: 2, fiber: 6, quantity: '100', per100g: true },
    { name: 'nuts mix', calories: 200, protein: 6, carbs: 8, fats: 16, fiber: 3, quantity: '30', per100g: true },
    { name: 'protein shake', calories: 120, protein: 25, carbs: 3, fats: 1, fiber: 0, quantity: '1', per100g: false },
  ],
  dinner: [
    { name: '150g chicken breast', calories: 247.5, protein: 46.5, carbs: 0, fats: 5.4, fiber: 0, quantity: '150', per100g: true },
    { name: '2 roti', calories: 297, protein: 7.9, carbs: 46, fats: 9.2, fiber: 2.7, quantity: '100', per100g: true },
    { name: '200g sabji', calories: 160, protein: 5, carbs: 24, fats: 4, fiber: 6, quantity: '200', per100g: true },
    { name: '100g dal', calories: 116, protein: 6.8, carbs: 20, fats: 0.4, fiber: 7.9, quantity: '100', per100g: true },
    { name: '150g paneer', calories: 397.5, protein: 27, carbs: 5.25, fats: 30, fiber: 0, quantity: '150', per100g: true },
    { name: '100g rice', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4, quantity: '100', per100g: true },
    { name: 'fish curry', calories: 150, protein: 18, carbs: 6, fats: 6, fiber: 1, quantity: '100', per100g: true },
    { name: 'chicken curry', calories: 180, protein: 20, carbs: 8, fats: 8, fiber: 2, quantity: '100', per100g: true },
    { name: 'veg pulav', calories: 160, protein: 5, carbs: 25, fats: 5, fiber: 3, quantity: '100', per100g: true },
  ],
};

/**
 * Get 3 food suggestions for a meal category based on remaining nutrients
 * @param offset - Optional offset to get different suggestions (for refresh functionality)
 */
export function getFoodSuggestions(
  category: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
  remaining: RemainingNutrients,
  offset: number = 0
): FoodSuggestion[] {
  const categoryFoods = FOOD_BY_CATEGORY[category] || [];
  
  if (categoryFoods.length === 0) return [];
  
  // Score each food based on how well it fulfills remaining needs
  const scoredFoods = categoryFoods.map(food => {
    let score = 0;
    
    // Prioritize foods that help fulfill remaining calories (but don't exceed too much)
    if (remaining.calories > 0) {
      const calorieMatch = Math.min(food.calories, remaining.calories) / remaining.calories;
      score += calorieMatch * 0.3;
    }
    
    // Prioritize foods that help fulfill remaining protein
    if (remaining.protein > 0) {
      const proteinMatch = Math.min(food.protein, remaining.protein) / remaining.protein;
      score += proteinMatch * 0.4; // Higher weight for protein
    }
    
    // Prioritize foods that help fulfill remaining carbs
    if (remaining.carbs > 0) {
      const carbsMatch = Math.min(food.carbs, remaining.carbs) / remaining.carbs;
      score += carbsMatch * 0.15;
    }
    
    // Prioritize foods that help fulfill remaining fats
    if (remaining.fats > 0) {
      const fatsMatch = Math.min(food.fats, remaining.fats) / remaining.fats;
      score += fatsMatch * 0.1;
    }
    
    // Prioritize foods that help fulfill remaining fiber
    if (remaining.fiber > 0) {
      const fiberMatch = Math.min(food.fiber, remaining.fiber) / remaining.fiber;
      score += fiberMatch * 0.05;
    }
    
    // Penalize foods that exceed remaining calories significantly
    if (food.calories > remaining.calories * 1.5) {
      score *= 0.5;
    }
    
    return { food, score };
  });
  
  // Sort by score (highest first)
  scoredFoods.sort((a, b) => b.score - a.score);
  
  // Apply offset to get different suggestions (wrap around if needed)
  const startIndex = offset % scoredFoods.length;
  const wrapped = [...scoredFoods.slice(startIndex), ...scoredFoods.slice(0, startIndex)];
  
  // Return top 3 from the offset position
  return wrapped.slice(0, 3).map(item => item.food);
}

