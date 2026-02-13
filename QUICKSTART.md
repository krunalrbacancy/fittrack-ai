# Quick Start Guide

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas account** (free) - [Sign up here](https://www.mongodb.com/cloud/atlas)

## Step-by-Step Setup

### 1. Get MongoDB Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (or use existing)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)
5. Replace `<password>` with your database password
6. Add database name at the end: `...mongodb.net/fittrack-ai?retryWrites=true&w=majority`

### 2. Setup Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
# Copy env.example to .env and update with your values
cp env.example .env
```

**Edit the `.env` file:**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_super_secret_jwt_key_change_this
NODE_ENV=development
```

**Start the backend server:**
```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

✅ Backend should be running on `http://localhost:5000`

### 3. Setup Frontend

**Open a NEW terminal window/tab:**

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend should be running on `http://localhost:3000`

### 4. Access the Application

1. Open your browser
2. Navigate to: `http://localhost:3000`
3. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in server/.env to a different port (e.g., 5001)
# Update client/vite.config.ts proxy target accordingly
```

**MongoDB connection error:**
- Verify your MongoDB Atlas connection string
- Make sure your IP is whitelisted in MongoDB Atlas (Network Access)
- Check if password has special characters (URL encode if needed)

**Module not found errors:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Port already in use:**
```bash
# Vite will automatically use next available port
# Or change in client/vite.config.ts
```

**Cannot connect to backend:**
- Make sure backend is running on port 5000
- Check `client/vite.config.ts` proxy settings
- Verify CORS is enabled in backend

**Module not found errors:**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

## Running Both Servers

You need **TWO terminal windows**:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## Production Build

### Build Frontend:
```bash
cd client
npm run build
# Output will be in client/dist/
```

### Run Production Backend:
```bash
cd server
NODE_ENV=production npm start
```

## Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

## API Health Check

Test if backend is running:
```bash
curl http://localhost:5000/api/health
```

Should return: `{"message":"Server is running"}`

## Next Steps

1. ✅ Both servers running
2. ✅ Login to application
3. ✅ Update your profile in "Profile" page
4. ✅ Start adding food entries in "Food Entries" page
5. ✅ Track your weight in "Weight" page
6. ✅ Monitor progress in "Dashboard"

Happy Tracking! 💪

