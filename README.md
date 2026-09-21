# FitTrack AI - Fitness Diet Management Web Application

A full-stack web application for tracking diet, weight, waist, steps, water, and workouts — with a personalized onboarding survey, per-user nutrition targets, and an AI fitness coach chatbot powered by Google Gemini.

## 🚀 Features

- **Multi-User Authentication**: Real signup/login per user (JWT + bcrypt), each account's data is fully isolated
- **Guided Onboarding Survey**: New users answer a few questions (age, gender, height, weight, activity level, goal) and get personalized calorie/macro targets calculated automatically
- **Guest Mode**: "Try as Guest" lets visitors explore the whole app — including the chatbot — using a shared demo account pre-filled with realistic sample data, auto-refreshed every 24 hours
- **AI Fitness Coach Chatbot**: A floating chat widget (available on every page) backed by Gemini, with:
  - Context-aware answers based on the user's own logged data (weight, food, steps, water, waist, workouts)
  - Ability to log food entries directly from natural language (e.g. "I had 2 eggs and toast for breakfast")
  - Per-user chat history, a daily token-usage budget with a live remaining-token indicator, and automatic fallback across multiple free-tier Gemini models if one hits its quota
- **Diet Management**: Add, edit, and delete food entries with calories, protein, carbs, fats, fiber, and sugar tracking, organized by meal category and normal/fasting day type
- **Daily Tracking Dashboard**: Real-time monitoring of calories, protein, carbs, fats, fiber, and water intake with progress bars and meal suggestions
- **Weight & Waist Management**: Log entries and visualize trends with charts
- **Steps & Workout Logging**: Track daily steps and workout sessions
- **BMI Calculation**: Automatic BMI calculation based on height and weight
- **Weekly Reports**: Detailed weight/waist progress, nutrition summaries, and an AI-style written summary of the week
- **Password Visibility Toggle**: Show/hide password fields on login and signup
- **Responsive, PWA-ready Design**: Installable, mobile-first UI that works on all devices

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- React Router for navigation
- Context API for state management
- Recharts for data visualization
- Axios for API calls
- PWA (installable, service worker)

### Backend
- Node.js with Express
- MongoDB Atlas with Mongoose ODM
- JWT for authentication, bcryptjs for password hashing
- `@google/genai` (Gemini API) for the AI chatbot, with function calling and automatic model fallback

## 📁 Project Structure

```
fittrack-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Layout, ChatWidget, ProtectedRoute, PasswordInput, ErrorBoundary
│   │   ├── context/       # AuthContext (login/register/guest/session state)
│   │   ├── pages/         # Landing, Login, Register, Onboarding, Dashboard, Foods, Tracking, Reports, Profile
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # api.ts, calculations, token helpers, food suggestions, PWA setup
│   │   ├── App.tsx        # Routes, incl. ProtectedRoute + onboarding gate
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Backend Express application
│   ├── config/            # Database connection
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # User, FoodEntry, WeightLog, WaistLog, WaterLog, StepsLog, WorkoutLog, ChatMessage, ChatUsage
│   ├── routes/            # auth, users, foods, weight, waist, water, workout, steps, reports, chat
│   ├── utils/             # nutritionTargets.js (BMR/TDEE calculator), seedGuest.js (guest demo data)
│   ├── server.js          # Server entry point
│   └── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm
- MongoDB Atlas account (or local MongoDB)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (optional — the app runs fine without it, just without the chatbot)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fittrack-ai
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   NODE_ENV=development

   # Optional — enables the AI chatbot. Get a free key at https://aistudio.google.com/apikey
   GEMINI_API_KEY=your_gemini_api_key

   # Optional — pin the chatbot to a single model. If unset, it automatically tries
   # gemini-flash-lite-latest, then gemini-flash-latest, then gemma-4-26b-a4b-it,
   # falling back to the next one whenever the current model's quota is exhausted.
   # GEMINI_MODEL=gemini-flash-lite-latest
   ```

4. **Set up the frontend**
   ```bash
   cd ../client
   npm install
   ```

5. **Configure frontend environment (optional)**
   Create a `.env` file in the `client` directory if you need to change the API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

This is two separate projects (`server/` and `client/`), each with its own `package.json` — there is no root-level `npm install`/`npm run dev`. Run each in its own terminal.

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   The client will run on `http://localhost:3000` (Vite will pick the next free port if it's taken)

3. **Access the application**
   Open your browser and navigate to `http://localhost:3000`. From the landing page you can sign up for a real account, log in, or click **"Try as Guest"** to explore instantly with pre-filled sample data.

### First-time login

There are no default/fixed credentials anymore. Register a new account from `/register`, or use **guest mode** for an instant demo — both are available from the landing and login pages. New accounts are guided through a short onboarding survey that sets personalized nutrition targets before reaching the dashboard.

## 📚 API Endpoints

### Authentication (`/api/auth`) — public
- `POST /api/auth/register` — create a new account
- `POST /api/auth/login` — log in
- `POST /api/auth/guest` — log in as the shared demo guest account (seeds/reseeds sample data as needed)

### User Profile (`/api/users`) — requires authentication
- `GET /api/users/profile` — get user profile
- `PUT /api/users/profile` — update user profile
- `POST /api/users/onboarding` — submit the onboarding survey; calculates and saves personalized nutrition targets

### Food Entries (`/api/foods`) — requires authentication
- `GET /api/foods` — get all food entries (optional query: `date`)
- `GET /api/foods/stats` — get daily stats (optional query: `date`)
- `GET /api/foods/weekly` — get weekly stats
- `POST /api/foods` — create food entry
- `PUT /api/foods/:id` — update food entry
- `DELETE /api/foods/:id` — delete food entry
- `POST /api/foods/migrate` — one-off data migration helper

### Weight / Waist / Water / Steps / Workout Logs — requires authentication
Each of `/api/weight`, `/api/waist`, `/api/water`, `/api/steps`, `/api/workout` exposes:
- `GET /` — list entries (optional query: `limit` or `date`, `water` also has `GET /stats`)
- `POST /` — create entry
- `PUT /:id` — update entry
- `DELETE /:id` — delete entry

### Reports (`/api/reports`) — requires authentication
- `GET /api/reports/weekly` — weight/waist/nutrition trends and an AI-style written summary for a date range (optional query: `startDate`, `endDate`)

### AI Chat (`/api/chat`) — requires authentication
- `GET /api/chat/history` — get the user's chat history
- `GET /api/chat/usage` — get today's token usage and remaining daily budget
- `POST /api/chat` — send a message to the AI coach; may log a food entry via function calling if the message describes something eaten
- `DELETE /api/chat/history` — clear chat history

## 🗄️ Database Models

### User
- username, password, name
- age, gender, height, activityLevel
- currentWeight, targetWeight, targetWaist
- goal, goalType, onboardingCompleted
- isGuest, guestResetAt
- daily/fasting targets: calorie, protein, carbs, fats, fiber, sugar

### FoodEntry
- userId, foodName, protein, calories, carbs, fats, fiber, sugar, quantity
- date, category (breakfast/lunch/snacks/dinner), dayType (normal/fasting)

### WeightLog / WaistLog
- userId, weight or waist, date, notes

### WaterLog
- userId, amount (ml), date

### StepsLog
- userId, steps, date, notes

### WorkoutLog
- userId, date, workoutType, duration, notes

### ChatMessage
- userId, role (user/assistant), content, timestamps

### ChatUsage
- userId, date, totalTokens (daily token usage counter, resets each calendar day)

## 🤖 AI Coach Chatbot

The floating chat widget (bottom-right on every logged-in page) is powered by Gemini via `@google/genai`:

- **Context-aware**: each request builds a summary of the user's last 7 days of weight, waist, food, steps, water, and workout logs, plus their profile and targets, and feeds it to the model as context.
- **Can log food for you**: describing a meal (e.g. "log a coffee and 2 boiled eggs") triggers a `log_food_entry` function call — the model estimates nutrition values and the server saves a real entry to the user's food diary.
- **Model fallback**: if the active model's free-tier quota is exhausted (HTTP 429), the server automatically retries with the next model in the chain (`gemini-flash-lite-latest` → `gemini-flash-latest` → `gemma-4-26b-a4b-it`) — transparent to the user.
- **Daily token budget**: usage is tracked per user per day (self-imposed 100,000-token soft budget, not a real Google-enforced limit) and shown live in the chat header; the input disables once exhausted for the day.

If `GEMINI_API_KEY` is not set, the rest of the app works normally — the chat endpoint simply responds with a 503 and the widget shows a "not configured" message.

## 🧮 Personalized Nutrition Targets

New users complete a short onboarding survey (`/onboarding`) instead of getting flat defaults. `server/utils/nutritionTargets.js` calculates:

- **Calories**: Mifflin-St Jeor BMR × activity-level multiplier, adjusted by goal (−500 kcal for lose weight, 0 for maintain, +300 for gain muscle), floored at 1200 kcal
- **Protein**: 1.0 g per kg bodyweight
- **Fats**: 1.0 g per kg bodyweight
- **Carbs**: 3.0 g per kg bodyweight
- **Fiber**: 14g per 1000 kcal
- **Sugar**: 10% of calories, treated as an upper cap
- **Fasting-day targets**: 75% of the normal-day numbers

## 👀 Guest Mode

Clicking "Try as Guest" (on the landing or login page) logs into a single shared `guest` account pre-seeded with ~3 weeks of realistic, goal-trending demo data (weight/waist trending toward targets, varied meals, steps, water, workouts). The account is safe to explore and chat with — if more than 24 hours have passed since the last reset, the next guest login automatically wipes and re-seeds fresh demo data.

## 🎯 Key Features Explained

### Daily Tracking Dashboard
- Shows total calories, protein, carbs, fats, fiber, and water consumed vs. personalized targets
- Progress bars with visual indicators
- Alerts when exceeding calorie targets or falling short on protein
- Meal suggestions and weekly analytics chart

### Diet Management
- Add food entries with date, category, and normal/fasting day type
- Edit and delete entries
- Filter by date
- Track full macro breakdown per food item

### Weight & Waist Management
- Log daily entries and view progress charts
- Calculate BMI automatically
- Show difference from target weight/waist

### Profile Management
- Update personal information, activity level, and goal
- View/adjust daily and fasting nutrition targets
- View BMI and profile summary

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in your hosting platform (including `GEMINI_API_KEY` if you want the chatbot live)
2. Ensure MongoDB Atlas allows connections from your server IP
3. Deploy the `server` directory

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Set environment variable `VITE_API_URL` to your backend URL

3. Deploy the `dist` folder

### Environment Variables for Production

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_strong_secret_key
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
```

**Frontend (.env)**
```env
VITE_API_URL=https://your-backend-url.com/api
```

## 🧪 Development

### Backend Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs `tsc` type-checking first)
- `npm run preview` - Preview production build

## 📝 Notes

- All API routes except `/api/auth/register`, `/api/auth/login`, and `/api/auth/guest` require a valid JWT (`Authorization: Bearer <token>`)
- JWT tokens are stored in `localStorage`
- Every user's data (food, weight, chat history, etc.) is scoped by their own `userId` — accounts are fully isolated except for the single shared `guest` demo account
- MongoDB Atlas connection string should include the database name
- All dates are stored in UTC and converted to local time in the frontend
- The AI chatbot is optional — the app is fully usable without a `GEMINI_API_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Built with ❤️ for fitness enthusiasts

---

**Happy Tracking! 💪**
