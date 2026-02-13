# Nutrition API Setup Guide

The FitTrack AI app includes automatic calorie and protein lookup functionality. When users enter food names like "2 boiled eggs" or "1 banana", the system automatically fetches nutrition data.

## How It Works

1. **Food Name Parsing**: The system automatically extracts quantity and food name from user input
   - Example: "2 boiled eggs" → quantity: 2, food name: "boiled eggs"
   - Example: "1 banana" → quantity: 1, food name: "banana"

2. **Nutrition Data Lookup**: 
   - First tries to fetch from Edamam Food Database API (if configured)
   - Falls back to local database of common foods if API is not available

3. **Auto-fill**: When nutrition data is found, calories and protein are automatically filled in

## Setup Options

### Option 1: Use Edamam API (Recommended for Production)

Edamam provides a free tier with 10,000 API calls per month.

#### Steps:

1. **Sign up for Edamam API**:
   - Go to https://developer.edamam.com/
   - Create a free account
   - Navigate to "Food Database API"
   - Create a new application
   - Copy your `Application ID` and `Application Key`

2. **Add Environment Variables**:
   
   Create or update `client/.env`:
   ```env
   VITE_EDAMAM_APP_ID=your_app_id_here
   VITE_EDAMAM_APP_KEY=your_app_key_here
   ```

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
  - Verify Edamam API credentials if using API
  - Try common foods from the local database (eggs, banana, etc.)

- **API rate limits?**
  - Edamam free tier: 10,000 calls/month
  - The app automatically falls back to local database if API fails

- **Want to disable auto-fill?**
  - Simply don't configure Edamam API credentials
  - The app will only use the local database

