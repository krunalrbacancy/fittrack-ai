// Nutrition API utility for fetching food nutrition data
// Using USDA FoodData Central API (free, government-maintained database)

interface NutritionData {
  calories: number;
  protein: number; // in grams
  quantity: number;
  foodName: string;
}

/**
 * Parse food name to extract quantity and food name
 * Examples:
 * "2 boiled eggs" -> { quantity: 2, foodName: "boiled eggs" }
 * "1 banana" -> { quantity: 1, foodName: "banana" }
 * "200g curd" -> { quantity: 2, foodName: "curd" } (200g = 2 servings of 100g)
 * "banana" -> { quantity: 1, foodName: "banana" }
 */
export function parseFoodInput(input: string): { quantity: number; foodName: string; weightInGrams?: number } {
  const trimmed = input.trim();
  
  // Match weight-based patterns like "200g curd", "150g paneer", etc.
  const weightMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(g|gram|grams|gm)\s+(.+)$/i);
  if (weightMatch) {
    const weightInGrams = parseFloat(weightMatch[1]);
    const foodName = weightMatch[3].trim();
    // For weight-based entries, we'll use weight/100 as quantity multiplier
    // This allows us to calculate nutrition per 100g and multiply
    return { quantity: weightInGrams / 100, foodName, weightInGrams };
  }
  
  // Match patterns like "2 eggs", "1.5 cups", "3/4 banana", etc.
  const quantityMatch = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+(.+)$/i);
  
  if (quantityMatch) {
    const quantityStr = quantityMatch[1];
    let quantity = 1;
    
    // Handle fraction (e.g., "3/4")
    if (quantityStr.includes('/')) {
      const [num, den] = quantityStr.split('/').map(Number);
      quantity = num / den;
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    const foodName = quantityMatch[2].trim();
    return { quantity, foodName };
  }
  
  // No quantity found, default to 1
  return { quantity: 1, foodName: trimmed };
}

/**
 * Fetch nutrition data from USDA FoodData Central API
 * Free API: https://fdc.nal.usda.gov/api-guide.html
 */
export async function fetchNutritionData(
  foodName: string,
  quantity: number = 1
): Promise<NutritionData | null> {
  try {
    // Use USDA FoodData Central API (free, no signup required for basic usage)
    // For production, get API key from https://api.data.gov/signup/
    const API_KEY = import.meta.env.VITE_USDA_API_KEY || '';
    
    // USDA API works without key for limited requests, but key is recommended
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search`;
    const params = new URLSearchParams({
      query: foodName,
      pageSize: '5', // Get top 5 results
      dataType: 'Foundation,SR Legacy', // Focus on common foods
    });
    
    if (API_KEY) {
      params.append('api_key', API_KEY);
    }
    
    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.foods && data.foods.length > 0) {
      // Get the first (most relevant) result
      const food = data.foods[0];
      
      // Extract nutrition data from foodNutrients array
      // USDA returns nutrients in different format
      let calories = 0;
      let protein = 0;
      
      if (food.foodNutrients) {
        food.foodNutrients.forEach((nutrient: any) => {
          // Energy (kcal) - nutrient ID 1008
          if (nutrient.nutrientId === 1008 || nutrient.nutrient?.id === 1008) {
            calories = nutrient.value || nutrient.amount || 0;
          }
          // Protein - nutrient ID 1003
          if (nutrient.nutrientId === 1003 || nutrient.nutrient?.id === 1003) {
            protein = nutrient.value || nutrient.amount || 0;
          }
        });
      }
      
      // USDA data is typically per 100g, so adjust for quantity
      // If quantity represents servings (not grams), multiply accordingly
      const multiplier = quantity;
      
      return {
        calories: Math.round(calories * multiplier),
        protein: Math.round(protein * multiplier * 10) / 10, // Round to 1 decimal
        quantity,
        foodName: food.description || foodName,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nutrition data from USDA:', error);
    return null;
  }
}

/**
 * Alternative: Use a simpler approach with a local database or fallback
 * This can be used if API is not available
 */
// Nutrition data per 100g or per unit (as specified)
const COMMON_FOODS: Record<string, { calories: number; protein: number; per100g?: boolean }> = {
  // Common foods (per unit)
  'egg': { calories: 70, protein: 6, per100g: false },
  'boiled egg': { calories: 70, protein: 6, per100g: false },
  'eggs': { calories: 70, protein: 6, per100g: false },
  'omelet': { calories: 154, protein: 10.6, per100g: false },
  'omlet': { calories: 154, protein: 10.6, per100g: false },
  'banana': { calories: 105, protein: 1.3, per100g: false },
  'apple': { calories: 95, protein: 0.5, per100g: false },
  'chicken breast': { calories: 165, protein: 31, per100g: false },
  'bread': { calories: 75, protein: 2.5, per100g: false },
  'milk': { calories: 150, protein: 8, per100g: false },
  'yogurt': { calories: 150, protein: 13, per100g: false },
  'oatmeal': { calories: 150, protein: 5, per100g: false },
  'salmon': { calories: 206, protein: 22, per100g: false },
  'broccoli': { calories: 55, protein: 3.7, per100g: false },
  'spinach': { calories: 23, protein: 2.9, per100g: false },
  
  // Indian foods (per 100g for weight-based entries)
  'curd': { calories: 98, protein: 11, per100g: true },
  'dahi': { calories: 98, protein: 11, per100g: true },
  'roti': { calories: 297, protein: 7.9, per100g: true },
  'chapati': { calories: 297, protein: 7.9, per100g: true },
  'phulka': { calories: 297, protein: 7.9, per100g: true },
  'sabji': { calories: 80, protein: 2.5, per100g: true },
  'sabzi': { calories: 80, protein: 2.5, per100g: true },
  'vegetable': { calories: 80, protein: 2.5, per100g: true },
  'paneer chilla': { calories: 265, protein: 18, per100g: true },
  'paneer chila': { calories: 265, protein: 18, per100g: true },
  'paneer': { calories: 265, protein: 18, per100g: true },
  'moong chilla': { calories: 196, protein: 13.2, per100g: true },
  'moong chila': { calories: 196, protein: 13.2, per100g: true },
  'moong dal chilla': { calories: 196, protein: 13.2, per100g: true },
  'rice': { calories: 130, protein: 2.7, per100g: true },
  'dal': { calories: 116, protein: 6.8, per100g: true },
  'lentil': { calories: 116, protein: 6.8, per100g: true },
};

/**
 * Get nutrition data from local database (fallback)
 */
export function getLocalNutritionData(
  foodName: string,
  quantity: number = 1,
  weightInGrams?: number
): NutritionData | null {
  const normalizedName = foodName.toLowerCase().trim();
  
  // Try exact match first
  for (const [key, nutrition] of Object.entries(COMMON_FOODS)) {
    if (normalizedName.includes(key)) {
      let multiplier = quantity;
      
      // If weight-based entry and food is per 100g, use weight directly
      if (weightInGrams && nutrition.per100g) {
        multiplier = weightInGrams / 100;
      } else if (nutrition.per100g && !weightInGrams) {
        // If food is per 100g but no weight specified, assume 100g
        multiplier = 1;
      }
      
      return {
        calories: Math.round(nutrition.calories * multiplier),
        protein: Math.round(nutrition.protein * multiplier * 10) / 10,
        quantity: weightInGrams ? weightInGrams / 100 : quantity,
        foodName,
      };
    }
  }
  
  return null;
}

/**
 * Main function to get nutrition data (tries API first, falls back to local)
 */
export async function getNutritionData(
  input: string
): Promise<NutritionData | null> {
  const { quantity, foodName, weightInGrams } = parseFoodInput(input);
  
  // Try API first
  const apiData = await fetchNutritionData(foodName, quantity);
  if (apiData) {
    return apiData;
  }
  
  // Fallback to local database
  return getLocalNutritionData(foodName, quantity, weightInGrams);
}

