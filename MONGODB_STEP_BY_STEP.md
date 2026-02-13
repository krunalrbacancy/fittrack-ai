# MongoDB Atlas Setup - Step by Step Guide

## Step 1: Cluster Configuration (Current Step)

### Cluster Name
- **Default:** `Cluster0` (this is fine, you can keep it)
- **Or change to:** `fittrack-cluster` or any name you prefer
- ⚠️ **Note:** You cannot change the name after creation, but it doesn't affect functionality

### Cloud Provider
- **Selected:** AWS (Amazon Web Services) ✅
- This is fine - AWS is reliable and widely used

### Region
- **Selected:** Mumbai (ap-south-1) ✅
- This is good for users in India
- If you're in a different region, choose the closest one to you

### Quick Setup Options
- ✅ **"Automate security setup"** - KEEP THIS CHECKED
  - This will automatically create a database user and whitelist your IP
- ✅ **"Preload sample dataset"** - You can UNCHECK this
  - We don't need sample data for our project

### Action Buttons
1. Click **"Create Deployment"** (green button, bottom right)
   - This will start creating your cluster (takes 3-5 minutes)

---

## Step 2: Wait for Cluster Creation

After clicking "Create Deployment":
- You'll see a progress screen
- Cluster creation takes **3-5 minutes**
- You'll see status: "Creating..." → "Creating..." → "Running" ✅

**While waiting:**
- Don't close the browser tab
- You can grab a coffee ☕

---

## Step 3: After Cluster is Created

Once your cluster shows "Running" status:

### A. Create Database User (if not auto-created)

1. Click **"Database Access"** in the left sidebar
2. If you see a user already created (from "Automate security setup"), skip to Step B
3. If not, click **"Add New Database User"**
4. Choose **"Password"** authentication
5. Enter:
   - **Username:** `fittrack-user` (or any username you prefer)
   - **Password:** Click "Autogenerate Secure Password" or create your own
   - ⚠️ **IMPORTANT:** Save the password! You'll need it for the connection string
6. Set privileges to **"Atlas admin"** (for development)
7. Click **"Add User"**

### B. Whitelist IP Address

1. Click **"Network Access"** in the left sidebar
2. Check if your IP is already added (from "Automate security setup")
3. If not, click **"Add IP Address"**
4. For development, click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` (allows all IPs)
   - ⚠️ **Note:** For production, use specific IPs only
5. Click **"Confirm"**

---

## Step 4: Get Connection String

1. Go back to **"Database"** in the left sidebar
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. Select:
   - **Driver:** Node.js
   - **Version:** 5.5 or later
5. **Copy the connection string**
   - It will look like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

---

## Step 5: Format Connection String for Your App

**The connection string you copied needs to be modified:**

### Original (from MongoDB):
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Modified (for your app):
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

**Changes:**
1. Replace `<username>` with your actual database username
2. Replace `<password>` with your actual database password
3. Add `/fittrack-ai` before the `?` (this is your database name)

**Example:**
```
mongodb+srv://fittrack-user:MyP@ssw0rd123@cluster0.abc123.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

---

## Step 6: Add to Your .env File

1. Open `server/.env` file in your project
2. Update the `MONGODB_URI` line:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/fittrack-ai?retryWrites=true&w=majority
```

3. **Replace:**
   - `yourusername` → Your MongoDB username
   - `yourpassword` → Your MongoDB password
   - `cluster0.xxxxx.mongodb.net` → Your actual cluster hostname

4. **Save the file**

---

## Step 7: Test Connection

1. Go back to your terminal where the server is running
2. The server should auto-restart (nodemon)
3. You should see:
   ```
   ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
   ```

If you see an error, check:
- Username and password are correct
- Password is URL-encoded if it has special characters
- IP is whitelisted in Network Access
- Connection string format is correct

---

## Quick Checklist

- [ ] Cluster created and running
- [ ] Database user created (username and password saved)
- [ ] IP address whitelisted (0.0.0.0/0 for development)
- [ ] Connection string copied from MongoDB Atlas
- [ ] Connection string formatted with `/fittrack-ai` database name
- [ ] Username and password replaced in connection string
- [ ] Connection string added to `server/.env` file
- [ ] Server restarted and connected successfully

---

## Special Characters in Password

If your password has special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

**Example:**
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`

---

## Need Help?

If you encounter any issues:
1. Check the error message in your terminal
2. Verify connection string format
3. Test connection string in MongoDB Atlas "Connect" dialog
4. See `TROUBLESHOOTING.md` for common issues

Good luck! 🚀

