# 🚀 Render.com Deployment Guide for MindEase Backend

## Prerequisites
- GitHub account
- Render.com account (free)
- MongoDB Atlas account (free)

---

## Step 1: Prepare MongoDB Atlas

1. **Go to MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. **Create Free Cluster**:
   - Sign up/Login
   - Create a new cluster (free tier)
   - Choose region closest to you
3. **Create Database User**:
   - Database Access → Add New User
   - Username: `mindease`
   - Password: Generate secure password (save it!)
   - Database User Privileges: Read and write to any database
4. **Whitelist IP**:
   - Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm
5. **Get Connection String**:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password
   - Example: `mongodb+srv://mindease:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/mindease?retryWrites=true&w=majority`

---

## Step 2: Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/MindEase.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Render

### **Option A: Using render.yaml (Automatic)**

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **New → Blueprint**
3. **Connect GitHub repository**
4. **Render will detect `render.yaml`**
5. **Add Environment Variables**:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Any random string (e.g., `your-super-secret-jwt-key-12345`)
6. **Click "Apply"**
7. **Wait for deployment** (5-10 minutes)

### **Option B: Manual Setup**

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **New → Web Service**
3. **Connect GitHub repository**
4. **Configure**:
   - **Name**: `mindease-backend`
   - **Region**: Singapore (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: 
     ```bash
     cd backend && npm install && cd python && chmod +x setup.sh && ./setup.sh
     ```
   - **Start Command**: 
     ```bash
     cd backend && node server.js
     ```
   - **Plan**: Free

5. **Add Environment Variables**:
   Click "Advanced" → Add Environment Variables:
   ```
   NODE_ENV = production
   MONGODB_URI = mongodb+srv://mindease:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/mindease
   JWT_SECRET = your-super-secret-jwt-key-12345
   PORT = 10000
   ```

6. **Create Web Service**

7. **Wait for deployment** (5-10 minutes)

---

## Step 4: Get Your Backend URL

After deployment completes:
- Your backend URL will be: `https://mindease-backend.onrender.com`
- Test it: `https://mindease-backend.onrender.com/api/health`

---

## Step 5: Update Frontend API URLs

Update the API_URL in these files:

### Files to Update:
1. `src/Screens/YogaSessionScreen.jsx`
2. `src/Screens/LoginScreen.jsx`
3. `src/Screens/RegisterScreen.jsx`
4. `src/Screens/Dashboard.jsx`
5. `src/Screens/EmotionInsightscreen.jsx`
6. `src/Screens/VideoEmotion.jsx`
7. `src/Screens/QuestionnaireScreen.jsx`
8. `src/Screens/Feedbackscreen.jsx`

### Change From:
```javascript
const API_URL = "http://192.168.3.55:5001";
```

### Change To:
```javascript
const API_URL = "https://mindease-backend.onrender.com";
```

---

## Step 6: Test Your Deployment

1. **Test Health Endpoint**:
   ```
   https://mindease-backend.onrender.com/api/health
   ```
   Should return: `{"status":"ok","message":"Server is running"}`

2. **Test Registration**:
   Use Postman or your app to test `/api/register`

3. **Test Login**:
   Use Postman or your app to test `/api/login`

---

## Step 7: Build APK

Now that backend is hosted:

```bash
# Update API URLs first (Step 5)

# Build APK
eas build -p android --profile preview
```

---

## Important Notes

### ⚠️ Free Tier Limitations:
- **Cold Starts**: Server sleeps after 15 minutes of inactivity
- **First request after sleep**: Takes 30-60 seconds to wake up
- **750 hours/month**: Enough for testing
- **No custom domain**: Uses `.onrender.com` subdomain

### 🐍 Python MediaPipe:
- The build command installs Python dependencies
- If MediaPipe fails, the app will use fallback mode
- For production, consider upgrading to paid plan

### 📦 File Uploads:
- Free tier has limited storage
- Uploaded files are temporary
- Consider using Cloudinary or AWS S3 for production

### 🔄 Auto-Deploy:
- Render auto-deploys when you push to GitHub
- Check "Auto-Deploy" in settings

---

## Troubleshooting

### Build Fails:
1. Check build logs in Render dashboard
2. Ensure `backend/package.json` has all dependencies
3. Check Python setup script permissions

### Server Won't Start:
1. Check environment variables are set
2. Verify MongoDB connection string
3. Check server logs in Render dashboard

### Can't Connect from App:
1. Verify backend URL is correct
2. Check CORS settings in `backend/server.js`
3. Test API endpoints with Postman first

### Cold Start Issues:
- First request after sleep takes time
- Consider upgrading to paid plan ($7/month) for always-on

---

## Environment Variables Reference

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindease
JWT_SECRET=your-secret-key-here
```

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Update frontend API URLs
3. ✅ Build APK with EAS
4. ✅ Test app on phone
5. ✅ Monitor Render dashboard for errors
6. ✅ Set up MongoDB Atlas monitoring

---

## Support

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Render Community**: https://community.render.com/

---

**Your backend will be live at**: `https://mindease-backend.onrender.com` 🎉