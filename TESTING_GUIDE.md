# Testing Guide - Yoga Pose Correction Feature

## Quick Start Testing

### 1. Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies (if not already done)
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/mindease
JWT_SECRET=mindease-secret-key-2024
PORT=5000
EOF

# Start MongoDB (if not running)
# On macOS with Homebrew:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod

# Start backend server
npm run dev
```

Expected output:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
```

### 2. Frontend Setup (5 minutes)

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Update API URL in YogaSessionScreen.jsx
# Find your local IP address:
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig

# Edit src/Screens/YogaSessionScreen.jsx
# Change: const API_URL = "http://192.168.1.6:5000";
# To: const API_URL = "http://YOUR_IP:5000";

# Start Expo
npm start
```

### 3. Run on Device

**Option A: Physical Device (Recommended)**
1. Install Expo Go app from App Store/Play Store
2. Scan QR code from terminal
3. Grant camera permissions when prompted

**Option B: Emulator**
```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## Testing Workflow

### Test 1: Basic Flow
1. **Register/Login**
   - Create new account or login
   - Complete questionnaire if new user

2. **Emotion Detection**
   - Record voice sample
   - Capture face image
   - Enter text description
   - View detected emotion

3. **Yoga Recommendations**
   - View recommended yoga poses
   - See pose details (duration, intensity)

4. **Start Yoga Session**
   - Tap on a pose to start session
   - Grant camera permission if prompted

### Test 2: Pose Correction
1. **Initial Setup**
   - Position yourself in front of camera
   - Ensure full body is visible
   - Check lighting is adequate

2. **Reference Video**
   - Watch YouTube reference video
   - Read instructions carefully
   - Note key points

3. **Perform Pose**
   - Get into position
   - Wait for camera to capture (every 2 seconds)
   - Observe "Analyzing..." indicator

4. **Real-time Feedback**
   - Check pose score (0-100)
   - Read overall feedback message
   - Follow specific corrections
   - Adjust body position accordingly

5. **Pose Completion**
   - Maintain score > 85%
   - Hold for ~6 seconds
   - See "Hold this position!" message
   - Automatic completion alert

6. **Next Pose**
   - Tap "Next Pose" button
   - Repeat process for next pose
   - Or tap "Skip" to skip current pose

7. **Session Complete**
   - Complete all poses
   - View session summary
   - Check pose history

### Test 3: Edge Cases

**Test Camera Issues:**
- Deny camera permission → Should show error message
- Cover camera → Should show "Position yourself in camera view"
- Poor lighting → May affect detection accuracy

**Test Network Issues:**
- Disconnect WiFi → Should show error
- Slow connection → May delay feedback
- Backend offline → Should handle gracefully

**Test Pose Variations:**
- Incorrect pose → Should show low score with corrections
- Partially correct → Should show medium score with specific feedback
- Perfect pose → Should show high score (>85%)

## Expected Results

### Successful Pose Detection
```
Score: 87%
Feedback: "Great form! Minor adjustments needed"
Details:
  • Left Knee: Almost there! Adjust slightly
```

### Pose Needs Correction
```
Score: 62%
Feedback: "Good effort! Keep adjusting"
Details:
  • Left Knee: decrease angle by 15°
  • Right Hip: increase angle by 10°
  • Spine Alignment: Almost there! Adjust slightly
```

### Perfect Pose
```
Score: 92%
Feedback: "Perfect! Hold this position 🔥"
[Green banner]: "Hold this position!"
```

## Troubleshooting

### Issue: Camera not working
**Solutions:**
- Check camera permissions in device settings
- Restart the app
- Try different device
- Check if camera works in other apps

### Issue: No pose detected
**Solutions:**
- Ensure full body is visible
- Move further from camera
- Improve lighting
- Check backend is running: `curl http://YOUR_IP:5000/api/health`

### Issue: Low accuracy scores
**Solutions:**
- Follow reference video closely
- Ensure proper lighting
- Check body alignment
- Hold pose steady (avoid movement)

### Issue: Backend errors
**Solutions:**
- Check MongoDB is running: `mongosh`
- Check backend logs in terminal
- Verify .env file exists
- Restart backend server

### Issue: "Network request failed"
**Solutions:**
- Verify backend URL is correct
- Check device and computer on same network
- Ping backend: `curl http://YOUR_IP:5000/api/health`
- Check firewall settings

## Performance Benchmarks

### Expected Performance:
- **Frame Capture**: Every 2 seconds
- **Backend Processing**: 500-1000ms per frame
- **Feedback Update**: 2-3 seconds total
- **Pose Completion**: 6-10 seconds of holding

### Optimization Tips:
- Reduce frame capture frequency for slower devices
- Compress images more (lower quality)
- Use local pose detection (TensorFlow Lite)
- Cache pose templates

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Frontend builds and runs
- [ ] Camera permission granted
- [ ] Camera feed displays correctly
- [ ] Reference video loads and plays
- [ ] Instructions display properly
- [ ] Pose detection triggers every 2 seconds
- [ ] Score updates in real-time
- [ ] Feedback messages are relevant
- [ ] Pose completion works (score > 85%)
- [ ] Next pose transition works
- [ ] Skip functionality works
- [ ] Session completion works
- [ ] Pose history saved to database
- [ ] No memory leaks (test for 5+ minutes)

## Database Verification

Check if pose history is saved:

```bash
# Connect to MongoDB
mongosh

# Use database
use mindease

# Check sessions
db.sessions.find().pretty()

# Check specific session
db.sessions.findOne({ _id: ObjectId("YOUR_SESSION_ID") })

# Verify pose history
db.sessions.findOne(
  { _id: ObjectId("YOUR_SESSION_ID") },
  { poseHistory: 1, averagePoseScore: 1, totalPosesCompleted: 1 }
)
```

Expected output:
```javascript
{
  _id: ObjectId("..."),
  poseHistory: [
    {
      poseId: "balasana",
      timestamp: ISODate("2024-..."),
      score: 87.5,
      feedback: [...],
      angles: { leftKnee: 45, rightKnee: 47, ... },
      duration: 30
    }
  ],
  averagePoseScore: 87.5,
  totalPosesCompleted: 1,
  bestPoseScore: 87.5
}
```

## API Testing

Test backend endpoints directly:

```bash
# Health check
curl http://localhost:5000/api/health

# Get pose templates
curl http://localhost:5000/api/pose/templates

# Get specific template
curl http://localhost:5000/api/pose/template/balasana

# Test pose detection (with image)
curl -X POST http://localhost:5000/api/pose/detect \
  -F "image=@/path/to/test-image.jpg"
```

## Production Deployment

### Before Deploying:

1. **Integrate Real Pose Detection:**
   - Replace mock detection with actual MediaPipe
   - Or integrate TensorFlow Lite
   - Or use cloud-based API

2. **Security:**
   - Use HTTPS for API
   - Implement rate limiting
   - Add authentication to pose endpoints
   - Sanitize file uploads

3. **Performance:**
   - Add Redis caching
   - Optimize image processing
   - Use CDN for videos
   - Implement load balancing

4. **Monitoring:**
   - Add error tracking (Sentry)
   - Implement analytics
   - Monitor API performance
   - Track user engagement

### Deployment Checklist:

- [ ] Environment variables configured
- [ ] Database backed up
- [ ] SSL certificates installed
- [ ] API rate limiting enabled
- [ ] Error tracking configured
- [ ] Analytics integrated
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] User testing completed

## Support

For issues or questions:
1. Check this guide first
2. Review POSE_CORRECTION_IMPLEMENTATION.md
3. Check backend logs
4. Test API endpoints directly
5. Verify database state

## Next Steps

After successful testing:
1. Integrate actual ML model for pose detection
2. Add more yoga poses
3. Implement voice feedback
4. Add progress tracking dashboard
5. Create social sharing features
6. Optimize for production deployment

---

**Note:** This is a development/testing implementation. For production, integrate actual MediaPipe or TensorFlow Lite models for accurate pose detection.