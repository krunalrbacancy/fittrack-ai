// Nutrition API utility for fetching food nutrition data
// Using Edamam Food Database API (free tier available)

interface NutritionData {
  calories: number;
  protein: number; // in grams
  quantity: number;
  foodName: string;
}

interface EdamamFood {
  food: {
    label: string;
    nutrients: {
      ENERC_KCAL: number; // Energy in kcal
      PROCNT: number; // Protein in grams
    };
    servingsPerContainer?: number;
  };
  measures?: Array<{
    label: string;
    weight: number;
  }>;
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
 * Fetch nutrition data from Edamam Food Database API
 */
export async function fetchNutritionData(
  foodName: string,
  quantity: number = 1
): Promise<NutritionData | null> {
  try {
    // Use Edamam Food Database API
    // Note: You'll need to get free API credentials from https://developer.edamam.com/
    const APP_ID = import.meta.env.VITE_EDAMAM_APP_ID || '';
    const APP_KEY = import.meta.env.VITE_EDAMAM_APP_KEY || '';
    
    if (!APP_ID || !APP_KEY) {
      console.warn('Edamam API credentials not configured');
      return null;
    }
    
    const url = `https://api.edamam.com/api/food-database/v2/parser`;
    const params = new URLSearchParams({
      app_id: APP_ID,
      app_key: APP_KEY,
      ingr: foodName,
      'nutrition-type': 'cooking',
    });
    
    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.hints && data.hints.length > 0) {
      const food = data.hints[0].food as EdamamFood['food'];
      const nutrients = food.nutrients;
      
      // Calculate nutrition for the specified quantity
      // Edamam returns per 100g, so we need to adjust
      // For simplicity, we'll use the first measure or default to 100g
      const baseWeight = 100; // grams (default)
      const multiplier = quantity; // Adjust based on quantity
      
      return {
        calories: Math.round(nutrients.ENERC_KCAL * multiplier),
        protein: Math.round(nutrients.PROCNT * multiplier * 10) / 10, // Round to 1 decimal
        quantity,
        foodName: food.label,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nutrition data:', error);
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

