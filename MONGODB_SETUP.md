# MongoDB Atlas Setup Guide

## Quick Setup Steps

### 1. Create MongoDB Atlas Account
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
- Sign up for a free account

### 2. Create a Free Cluster
1. Click "Build a Database"
2. Choose "FREE" (M0 Sandbox) tier
3. Select a cloud provider and region (choose closest to you)
4. Click "Create"

### 3. Create Database User
1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username and generate a secure password
5. **Save the password** - you'll need it for the connection string
6. Set user privileges to "Atlas admin" (for development)
7. Click "Add User"

### 4. Whitelist Your IP Address
1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (adds 0.0.0.0/0)
   - ⚠️ **Note:** For production, use specific IPs only
4. Click "Confirm"

### 5. Get Connection String
1. Go to "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "5.5 or later"
5. Copy the connection string

### 6. Format Your Connection String

**Example connection string:**
```
mongodb+srv://myusername:mypassword@cluster0.xxxxx.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

**Important:**
- Replace `<password>` with your actual database user password
- Replace `myusername` with your database username
- Add `/fittrack-ai` before the `?` (this is your database name)
- If password has special characters, URL-encode them:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `$` becomes `%24`
  - `%` becomes `%25`
  - etc.

### 7. Add to .env File

**Edit `server/.env`:**
```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

**Example:**
```env
MONGODB_URI=mongodb+srv://admin:MyP@ssw0rd123@cluster0.abc123.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

## Common Issues

### Error: "querySrv ENOTFOUND"
**Cause:** Invalid or malformed connection string
**Solution:**
- Verify connection string format
- Check cluster hostname is correct
- Make sure you copied the entire string

### Error: "Authentication failed"
**Cause:** Wrong username/password
**Solution:**
- Verify database user credentials
- URL-encode special characters in password
- Check user has proper permissions

### Error: "Connection timeout"
**Cause:** IP not whitelisted or network issue
**Solution:**
- Add your IP to MongoDB Atlas Network Access
- For development, use 0.0.0.0/0 (allows all IPs)
- Check internet connection

### Error: "MONGODB_URI is not defined"
**Cause:** Missing .env file or variable
**Solution:**
- Create `server/.env` file
- Copy from `server/env.example`
- Add your MongoDB connection string

## Testing Connection

After setting up, restart your backend server:
```bash
cd server
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
```

If you see an error, check the error message for specific troubleshooting steps.

## Security Notes

⚠️ **For Development:**
- Using 0.0.0.0/0 for IP whitelist is OK
- Keep your .env file secure (don't commit it)

⚠️ **For Production:**
- Use specific IP addresses only
- Use strong passwords
- Enable MongoDB Atlas security features
- Rotate credentials regularly

## Need Help?

1. Check MongoDB Atlas dashboard for cluster status
2. Verify connection string in MongoDB Atlas "Connect" dialog
3. Test connection string format
4. Check server logs for detailed error messages
5. See `TROUBLESHOOTING.md` for more help

