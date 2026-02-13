# Nutrition API Setup Guide

The FitTrack AI app includes automatic calorie and protein lookup functionality. When users enter food names like "2 boiled eggs", "200g curd", or "roti", the system automatically fetches nutrition data.

## How It Works

1. **Food Name Parsing**: The system automatically extracts quantity and food name from user input
   - Example: "2 boiled eggs" → quantity: 2, food name: "boiled eggs"
   - Example: "200g curd" → weight: 200g, food name: "curd"
   - Example: "roti" → quantity: 1, food name: "roti"

2. **Nutrition Data Lookup**: 
   - First tries to fetch from USDA FoodData Central API (free, works without key for limited requests)
   - Falls back to local database of common foods if API is not available

3. **Auto-fill**: When nutrition data is found, calories and protein are automatically filled in

## Setup Options

### Option 1: Use USDA FoodData Central API (Recommended - Free & No Signup Required)

USDA FoodData Central is a free, government-maintained nutrition database. It works without an API key for limited requests, but you can get a free API key for higher limits.

#### Steps:

1. **Get Free API Key (Optional but Recommended)**:
   - Go to https://api.data.gov/signup/
   - Sign up for a free account
   - You'll receive an API key via email
   - Free tier: 1,000 requests per hour

2. **Add Environment Variable (Optional)**:
   
   Create or update `client/.env`:
   ```env
   VITE_USDA_API_KEY=your_api_key_here
   ```
   
   **Note**: The API works without a key for basic usage, but with a key you get higher rate limits.

3. **Restart Development Server**:
   ```bash
   cd client
   npm run dev
   ```

### Option 2: Use Local Database (Default - No Setup Required)

The app includes a built-in database of common foods that works without any API setup:

- Eggs, bananas, apples, chicken breast, rice, bread, milk, yogurt, oatmeal, salmon, broccoli, spinach, and more

The local database will automatically be used if Edamam API credentials are not configured.

## Features

- ✅ **Automatic Parsing**: Extracts quantity from food names
- ✅ **Debounced Search**: Waits 800ms after typing stops before searching
- ✅ **Visual Feedback**: Shows loading indicator while fetching data
- ✅ **Error Handling**: Gracefully falls back if API is unavailable
- ✅ **Manual Override**: Users can always manually edit the auto-filled values

## Adding More Foods to Local Database

To add more foods to the local database, edit `client/src/utils/nutrition.ts`:

```typescript
const COMMON_FOODS: Record<string, { calories: number; protein: number }> = {
  'your-food-name': { calories: 100, protein: 10 },
  // ... add more foods
};
```

## Testing

1. Open the "Add Food Entry" modal
2. Type a food name like "2 boiled eggs" or "1 banana"
3. Wait 800ms (debounce delay)
4. Calories and protein should auto-fill
5. You can still manually edit the values if needed

## Troubleshooting

- **Nutrition data not appearing?**
  - Check browser console for errors
  - USDA API works without key but has rate limits
  - Try common foods from the local database (eggs, banana, curd, roti, etc.)
  - Some foods may need more specific names (e.g., "chicken breast" instead of "chicken")

- **API rate limits?**
  - USDA API without key: Limited requests per hour
  - USDA API with key: 1,000 requests per hour (free tier)
  - The app automatically falls back to local database if API fails

- **Want to disable auto-fill?**
  - Click the "Auto-fill" button in the food form to switch to "Manual Entry" mode
  - Or simply don't configure USDA API key (will use local database)

## Supported Food Formats

- **Quantity-based**: "2 eggs", "1 banana", "3 roti"
- **Weight-based**: "200g curd", "150g paneer", "100g rice"
- **Simple names**: "roti", "sabji", "omelet", "curd"
- **Indian foods**: curd, roti, sabji, paneer chilla, moong chilla, dal, rice, etc.

