# Troubleshooting Guide

## Login Failed Error

If you're seeing "Login failed" or connection errors, follow these steps:

### Step 1: Check if Backend is Running

**Open a terminal and run:**
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{"message":"Server is running"}
```

**If you get an error:**
- Backend is not running
- Start it: `cd server && npm run dev`

### Step 2: Check Backend Logs

Look at your backend terminal. You should see:
```
Server running on port 5000
MongoDB Connected: ...
```

**Common errors:**

1. **"MongoDB connection error"**
   - Check your `.env` file in `server/` directory
   - Verify `MONGODB_URI` is correct
   - Make sure MongoDB Atlas allows connections from your IP

2. **"Port 5000 already in use"**
   - Change PORT in `server/.env` to another port (e.g., 5001)
   - Update `client/vite.config.ts` proxy target accordingly

3. **"Cannot find module"**
   - Run: `cd server && npm install`

### Step 3: Check Frontend Connection

**Open browser console (F12) and check:**
- Network tab → Look for `/api/auth/login` request
- Check if it's failing with CORS error or connection refused

**Common issues:**

1. **CORS Error**
   - Backend CORS is enabled, but check if backend is running

2. **Connection Refused**
   - Backend is not running on port 5000
   - Check `vite.config.ts` proxy settings

3. **404 Not Found**
   - Backend routes might be wrong
   - Verify backend is running and routes are registered

### Step 4: Verify Environment Variables

**Check `server/.env` file exists and has:**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=any_secret_string
NODE_ENV=development
```

**Important:**
- `.env` file must be in `server/` directory
- MongoDB URI must be complete and valid
- JWT_SECRET can be any string (use a strong one in production)

### Step 5: Test MongoDB Connection

**In your backend terminal, you should see:**
```
MongoDB Connected: cluster0.xxxxx.mongodb.net
```

**If you see connection errors:**
1. Check MongoDB Atlas dashboard
2. Verify IP whitelist (add 0.0.0.0/0 for development)
3. Check connection string format
4. Verify database user credentials

### Step 6: Quick Fixes

**Restart everything:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

**Clear browser cache:**
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear localStorage: Open DevTools → Application → Local Storage → Clear

**Reinstall dependencies:**
```bash
# Backend
cd server
rm -rf node_modules package-lock.json
npm install

# Frontend
cd client
rm -rf node_modules package-lock.json
npm install
```

## Common Error Messages

### "Cannot connect to server"
- **Solution:** Start backend server (`cd server && npm run dev`)

### "Invalid credentials"
- **Solution:** Use `admin` / `admin123` (case-sensitive)

### "Server error"
- **Solution:** Check backend logs, verify MongoDB connection

### "Network Error"
- **Solution:** Check if backend is running, verify proxy settings

## Still Having Issues?

1. Check both terminal windows are running
2. Verify ports 3000 and 5000 are not used by other apps
3. Check firewall/antivirus isn't blocking connections
4. Try accessing backend directly: `http://localhost:5000/api/health`
5. Check browser console for detailed error messages

