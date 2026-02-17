// Nutrition API utility for fetching food nutrition data
// Using USDA FoodData Central API (free, government-maintained database)

interface NutritionData {
  calories: number;
  protein: number; // in grams
  carbs?: number; // in grams
  fats?: number; // in grams
  fiber?: number; // in grams
  quantity: number;
  foodName: string;
  isPerUnit?: boolean; // true if this is per-unit (e.g., per nut), false if per-100g
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
      // Prefer whole foods over processed products
      // Keywords that indicate whole/raw/cooked foods
      const wholeFoodKeywords = ['nuts,', 'raw', 'fresh', 'whole', 'unprocessed', 'cooked', 'boiled', 'steamed', 'rice,', 'rice '];
      // Keywords to avoid (processed products)
      const processedKeywords = ['flour', 'oil', 'butter', 'powder', 'extract', 'paste', 'sauce', 'candy', 'candies', 'processed', 'canned', 'dried', 'crackers', 'cakes', 'snacks', 'crispy', 'fried'];
      
      // Find the best match
      let bestFood = data.foods[0];
      let bestScore = 0;
      
      for (const food of data.foods) {
        const description = (food.description || '').toLowerCase();
        let score = food.score || 0;
        
        // Boost score for whole foods
        for (const keyword of wholeFoodKeywords) {
          if (description.includes(keyword)) {
            score += 100;
            break;
          }
        }
        
        // Reduce score for processed products
        for (const keyword of processedKeywords) {
          if (description.includes(keyword)) {
            score -= 50;
            break;
          }
        }
        
        // Prefer exact matches (e.g., "almonds" should match "Nuts, almonds" better than "Flour, almond")
        const searchTerm = foodName.toLowerCase();
        if (description.includes(searchTerm) && !description.includes(',')) {
          score += 20; // Boost for simple names
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestFood = food;
        }
      }
      
      // Use the best match
      const food = bestFood;

      // Extract nutrition data from foodNutrients array
      // USDA returns nutrients in different format
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fats = 0;
      let fiber = 0;

      if (food.foodNutrients) {
        food.foodNutrients.forEach((nutrient: any) => {
          const value = nutrient.value || nutrient.amount || 0;
          const nutrientId = nutrient.nutrientId || nutrient.nutrient?.id;

          // Energy (kcal) - nutrient ID 1008 (primary)
          // Also check for alternative energy IDs: 2047 (Atwater General), 2048 (Atwater Specific)
          // Prefer 1008, but fall back to others if 1008 is not available
          if (nutrientId === 1008) {
            calories = value;
          } else if (nutrientId === 2047 || nutrientId === 2048) {
            // Use alternative energy values if 1008 is not found
            if (calories === 0) {
              calories = value;
            }
          }
          // Protein - nutrient ID 1003
          else if (nutrientId === 1003) {
            protein = value;
          }
          // Carbohydrate, by difference - nutrient ID 1005
          else if (nutrientId === 1005) {
            carbs = value;
          }
          // Total lipid (fat) - nutrient ID 1004
          else if (nutrientId === 1004) {
            fats = value;
          }
          // Fiber, total dietary - nutrient ID 1079
          else if (nutrientId === 1079) {
            fiber = value;
          }
        });
      }

      // Check if this is a per-unit food (nuts, eggs, roti/chapati)
      const description = (food.description || '').toLowerCase();
      const isNut = description.includes('nuts,') || description.includes('nuts ');
      // Detect eggs - look for "egg" but exclude "eggplant", "eggnog", etc.
      // USDA egg descriptions typically include "egg" and often "whole", "large", "grade", or "raw"
      const isEgg = (description.includes('egg') || description.includes('eggs')) && 
                    !description.includes('eggplant') && 
                    !description.includes('eggnog');
      const isRoti = description.includes('roti') || description.includes('chapati') || description.includes('phulka');
      
      // Common per-unit food counts per 100g (average)
      const perUnitCountsPer100g: Record<string, number> = {
        // Nuts
        'almond': 90,
        'almonds': 90,
        'walnut': 35,
        'walnuts': 35,
        'cashew': 75,
        'cashews': 75,
        'peanut': 110,
        'peanuts': 110,
        'pistachio': 100,
        'pistachios': 100,
        'pecan': 70,
        'pecans': 70,
        'hazelnut': 80,
        'hazelnuts': 80,
        'brazil nut': 15,
        'brazil nuts': 15,
        'macadamia': 50,
        'macadamias': 50,
        // Eggs (1 large egg ≈ 50g)
        'egg': 2,
        'eggs': 2,
        // Roti/Chapati (1 roti ≈ 35g)
        'roti': 2.86, // 100/35
        'chapati': 2.86,
        'phulka': 2.86,
      };
      
      let multiplier: number;
      let isPerUnit = false;
      
      if (isNut || isEgg || isRoti) {
        // For per-unit foods, find the type and convert to per-unit
        let unitsPer100g = 100; // Default fallback
        for (const [foodName, count] of Object.entries(perUnitCountsPer100g)) {
          if (description.includes(foodName)) {
            unitsPer100g = count;
            break;
          }
        }
        
        // For per-unit foods, always convert to per-unit
        // If quantity is 100 (per 100g from API), convert to per-unit (1 unit)
        // Otherwise, treat quantity as number of units
        if (quantity === 100) {
          // Convert per-100g to per-unit (1 unit)
          multiplier = 1 / unitsPer100g;
          isPerUnit = true;
        } else {
          // Quantity is already number of units, convert to multiplier
          multiplier = quantity / unitsPer100g;
          isPerUnit = true;
        }
      } else {
        // For non-per-unit foods, USDA data is always per 100g, so treat quantity as grams
        // Divide by 100 to get the multiplier (e.g., 100g = 1.0, 50g = 0.5, 1g = 0.01)
        multiplier = quantity / 100;
      }

      return {
        calories: Math.round(calories * multiplier),
        protein: Math.round(protein * multiplier * 10) / 10, // Round to 1 decimal
        carbs: Math.round(carbs * multiplier * 10) / 10,
        fats: Math.round(fats * multiplier * 10) / 10,
        fiber: Math.round(fiber * multiplier * 10) / 10,
        quantity: isPerUnit ? (quantity === 100 ? 1 : quantity) : quantity, // For nuts from API (100g), return 1; otherwise return actual quantity
        foodName: food.description || foodName,
        isPerUnit, // Add flag to indicate if this is per-unit
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
const COMMON_FOODS: Record<string, { calories: number; protein: number; carbs?: number; fats?: number; fiber?: number; per100g?: boolean }> = {
  // Common foods (per unit)
  'egg': { calories: 70, protein: 6, carbs: 0.4, fats: 5, fiber: 0, per100g: false },
  'boiled egg': { calories: 70, protein: 6, carbs: 0.4, fats: 5, fiber: 0, per100g: false },
  'eggs': { calories: 70, protein: 6, carbs: 0.4, fats: 5, fiber: 0, per100g: false },
  'omelet': { calories: 154, protein: 10.6, carbs: 1.1, fats: 12, fiber: 0, per100g: false },
  'omlet': { calories: 154, protein: 10.6, carbs: 1.1, fats: 12, fiber: 0, per100g: false },
  'banana': { calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3.1, per100g: false },
  'apple': { calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4.4, per100g: false },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0, per100g: true },
  'chicken': { calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0, per100g: true },
  'bread': { calories: 75, protein: 2.5, carbs: 14, fats: 1, fiber: 0.8, per100g: false },
  'milk': { calories: 150, protein: 8, carbs: 12, fats: 8, fiber: 0, per100g: false },
  'yogurt': { calories: 150, protein: 13, carbs: 11, fats: 4, fiber: 0, per100g: false },
  'oatmeal': { calories: 150, protein: 5, carbs: 27, fats: 3, fiber: 4, per100g: false },
  'salmon': { calories: 206, protein: 22, carbs: 0, fats: 12, fiber: 0, per100g: true },
  'broccoli': { calories: 55, protein: 3.7, carbs: 11, fats: 0.6, fiber: 2.6, per100g: true },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, fiber: 2.2, per100g: true },

  // Indian foods (per 100g for weight-based entries)
  'curd': { calories: 98, protein: 11, carbs: 3.4, fats: 4.3, fiber: 0, per100g: true },
  'dahi': { calories: 98, protein: 11, carbs: 3.4, fats: 4.3, fiber: 0, per100g: true },
  'roti': { calories: 85, protein: 2.3, carbs: 13, fats: 2.6, fiber: 0.8, per100g: false }, // Per roti (~30g)
  'chapati': { calories: 85, protein: 2.3, carbs: 13, fats: 2.6, fiber: 0.8, per100g: false }, // Per chapati (~30g)
  'phulka': { calories: 85, protein: 2.3, carbs: 13, fats: 2.6, fiber: 0.8, per100g: false }, // Per phulka (~30g)
  'sabji': { calories: 80, protein: 2.5, carbs: 12, fats: 2, fiber: 3, per100g: true },
  'sabzi': { calories: 80, protein: 2.5, carbs: 12, fats: 2, fiber: 3, per100g: true },
  'vegetable': { calories: 80, protein: 2.5, carbs: 12, fats: 2, fiber: 3, per100g: true },
  'paneer chilla': { calories: 265, protein: 18, carbs: 12, fats: 15, fiber: 1, per100g: true },
  'paneer chila': { calories: 265, protein: 18, carbs: 12, fats: 15, fiber: 1, per100g: true },
  'paneer': { calories: 265, protein: 18, carbs: 3.5, fats: 20, fiber: 0, per100g: true },
  'moong chilla': { calories: 196, protein: 13.2, carbs: 18, fats: 6, fiber: 5, per100g: true },
  'moong chila': { calories: 196, protein: 13.2, carbs: 18, fats: 6, fiber: 5, per100g: true },
  'moong dal chilla': { calories: 196, protein: 13.2, carbs: 18, fats: 6, fiber: 5, per100g: true },
  'rice': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4, per100g: true },
  'dal': { calories: 116, protein: 6.8, carbs: 20, fats: 0.4, fiber: 7.9, per100g: true },
  'lentil': { calories: 116, protein: 6.8, carbs: 20, fats: 0.4, fiber: 7.9, per100g: true },
  'chana': { calories: 164, protein: 8.9, carbs: 27, fats: 2.6, fiber: 7.6, per100g: true },
  'chickpea': { calories: 164, protein: 8.9, carbs: 27, fats: 2.6, fiber: 7.6, per100g: true },
  'chickpeas': { calories: 164, protein: 8.9, carbs: 27, fats: 2.6, fiber: 7.6, per100g: true },
  'chole': { calories: 164, protein: 8.9, carbs: 27, fats: 2.6, fiber: 7.6, per100g: true },
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
        carbs: nutrition.carbs ? Math.round(nutrition.carbs * multiplier * 10) / 10 : undefined,
        fats: nutrition.fats ? Math.round(nutrition.fats * multiplier * 10) / 10 : undefined,
        fiber: nutrition.fiber ? Math.round(nutrition.fiber * multiplier * 10) / 10 : undefined,
        quantity: weightInGrams ? weightInGrams / 100 : quantity,
        foodName,
      };
    }
  }

  return null;
}

/**
 * Get list of food suggestions for autocomplete
 */
export function getFoodSuggestions(query: string = ''): string[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Get all unique food names from COMMON_FOODS
  const foodNames = Object.keys(COMMON_FOODS);

  // Filter and sort by relevance
  const filtered = foodNames.filter(name =>
    name.toLowerCase().includes(normalizedQuery)
  );

  // Sort: exact matches first, then by length
  filtered.sort((a, b) => {
    const aExact = a.toLowerCase() === normalizedQuery;
    const bExact = b.toLowerCase() === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.length - b.length;
  });

  return filtered.slice(0, 10); // Return top 10 suggestions
}

/**
 * Get base nutrition data for a food (per unit or per 100g)
 * Returns the base values and whether it's per100g
 */
export function getBaseNutritionData(foodName: string): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  per100g: boolean;
} | null {
  const normalizedName = foodName.toLowerCase().trim();

  // Check in COMMON_FOODS
  for (const [key, nutrition] of Object.entries(COMMON_FOODS)) {
    if (normalizedName.includes(key)) {
      return {
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs || 0,
        fats: nutrition.fats || 0,
        fiber: nutrition.fiber || 0,
        per100g: nutrition.per100g || false,
      };
    }
  }

  return null;
}

/**
 * Get nutrition data for a specific food name (for dropdown selection)
 */
export async function getNutritionForFood(
  foodName: string,
  quantity: number = 1,
  weightInGrams?: number
): Promise<NutritionData | null> {
  // Try local database first (faster)
  const localData = getLocalNutritionData(foodName, quantity, weightInGrams);
  if (localData) {
    return localData;
  }

  // Fallback to API
  return await fetchNutritionData(foodName, quantity);
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

/**
 * Get nutrition data from static database only (no API call)
 * This is used when user types a food name and we want to auto-fill from local data
 */
export function getNutritionFromStaticOnly(
  foodName: string
): { nutritionData: NutritionData; isPer100g: boolean } | null {
  const baseData = getBaseNutritionData(foodName);
  if (baseData) {
    const quantity = baseData.per100g ? 100 : 1;
    const localData = getLocalNutritionData(foodName, quantity, undefined);
    if (localData) {
      return { nutritionData: localData, isPer100g: baseData.per100g };
    }
  }
  return null;
}

/**
 * Get nutrition data for auto-fill (always returns per 100g for USDA, or per unit for local)
 * This is used when user clicks "Search API" button to search USDA database
 */
export async function getNutritionForAutoFill(
  foodName: string,
  useAPI: boolean = false
): Promise<{ nutritionData: NutritionData; isPer100g: boolean } | null> {
  // If not using API, only check static database
  if (!useAPI) {
    return getNutritionFromStaticOnly(foodName);
  }

  // Check if food exists in local DB first (for common foods like rice, dal, etc.)
  // This ensures we get the right food (e.g., "rice" not "rice crackers")
  const baseData = getBaseNutritionData(foodName);
  if (baseData) {
    // For common foods in our database, prefer local data over API
    const quantity = baseData.per100g ? 100 : 1;
    const localData = getLocalNutritionData(foodName, quantity, undefined);
    if (localData) {
      return { nutritionData: localData, isPer100g: baseData.per100g };
    }
  }

  // Try USDA API - fetch per 100g, but it will convert to per-unit for nuts/eggs/roti
  const apiData = await fetchNutritionData(foodName, 100);
  if (apiData) {
    // If it's a per-unit food (isPerUnit flag), treat as per-unit, otherwise per-100g
    const isPer100g = !apiData.isPerUnit;
    return { nutritionData: apiData, isPer100g };
  }

  return null;
}

