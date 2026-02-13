# FitTrack AI - Fitness Diet Management Web Application

A complete full-stack web application to help users reduce belly fat by tracking diet, protein intake, calories, and weight progress.

## 🚀 Features

- **User Authentication**: Secure login with fixed credentials
- **User Profile Management**: Track personal information, goals, and targets
- **Diet Management**: Add, edit, and delete food entries with calories and protein tracking
- **Daily Tracking Dashboard**: Real-time monitoring of calories and protein intake with progress bars
- **Weight Management**: Log weight entries and visualize progress with charts
- **BMI Calculation**: Automatic BMI calculation based on height and weight
- **Weekly Analytics**: View weekly trends with interactive charts
- **Smart Alerts**: Warnings for exceeding calorie targets and reminders for protein deficits
- **Responsive Design**: Beautiful, modern UI that works on all devices

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- React Router for navigation
- Context API for state management
- Recharts for data visualization
- Axios for API calls

### Backend
- Node.js with Express
- MongoDB Atlas for database
- JWT for authentication
- bcryptjs for password hashing
- Mongoose for ODM

## 📁 Project Structure

```
fittrack-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Context API providers
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Backend Express application
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── server.js          # Server entry point
│   └── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

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
   The client will run on `http://localhost:3000`

3. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

### Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Food Entries
- `GET /api/foods` - Get all food entries (optional query: `date`)
- `GET /api/foods/stats` - Get daily stats (optional query: `date`)
- `GET /api/foods/weekly` - Get weekly stats
- `POST /api/foods` - Create food entry
- `PUT /api/foods/:id` - Update food entry
- `DELETE /api/foods/:id` - Delete food entry

### Weight Logs
- `GET /api/weight` - Get all weight logs (optional query: `limit`)
- `POST /api/weight` - Create weight log
- `PUT /api/weight/:id` - Update weight log
- `DELETE /api/weight/:id` - Delete weight log

## 🗄️ Database Models

### User
- username, password
- name, age, height
- currentWeight, targetWeight
- goal, dailyCalorieTarget, dailyProteinTarget

### FoodEntry
- userId, foodName
- protein, calories, quantity
- date

### WeightLog
- userId, weight
- date, notes

## 🎯 Key Features Explained

### Daily Tracking Dashboard
- Shows total calories and protein consumed
- Displays remaining calories and protein
- Progress bars with visual indicators
- Alerts when exceeding calorie targets
- Reminders for protein deficits
- Weekly analytics chart

### Diet Management
- Add food entries with date selection
- Edit and delete entries
- Filter by date
- Track calories and protein per food item

### Weight Management
- Log daily weight entries
- View weight progress chart
- Calculate BMI automatically
- Show difference from target weight
- Track weight over time

### Profile Management
- Update personal information
- Set daily calorie and protein targets
- Set target weight
- View BMI and profile summary

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in your hosting platform
2. Ensure MongoDB Atlas allows connections from your server IP
3. Deploy the server directory

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
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📝 Notes

- All API routes (except `/api/auth/login`) require authentication
- JWT tokens are stored in localStorage
- The application uses fixed login credentials for simplicity
- MongoDB Atlas connection string should include database name
- All dates are stored in UTC and converted to local time in the frontend

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

