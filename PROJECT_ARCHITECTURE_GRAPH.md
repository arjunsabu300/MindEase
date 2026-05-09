# MindEase - Project Architecture Graph & Reference Guide

> **Purpose**: This document serves as a comprehensive reference for the MindEase project structure, reducing token usage in future conversations by providing a complete architectural overview.

---

## 📊 Project Overview

**MindEase** is an AI-powered emotional wellness mobile application built with:
- **Frontend**: React Native (Expo)
- **Backend**: Node.js/Express
- **Database**: MongoDB
- **AI/ML**: MediaPipe Pose Detection, Emotion Recognition (Face/Voice/Text), LLM (Groq)

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (Expo)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Screens    │  │    Hooks     │  │   Utils      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Express)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Services    │  │   Models     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES & DATABASE                    │
│  MongoDB | Hugging Face APIs | Groq LLM | YouTube API       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
MindEase/
├── 📱 FRONTEND (React Native/Expo)
│   ├── src/
│   │   ├── Screens/          # UI Screens
│   │   ├── Components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   ├── assets/               # Images, icons
│   ├── App.js                # Root component
│   ├── app.json              # Expo config
│   ├── eas.json              # EAS Build config
│   └── package.json          # Dependencies
│
├── 🖥️ BACKEND (Node.js/Express)
│   ├── backend/
│   │   ├── routes/           # API endpoints
│   │   ├── models/           # MongoDB schemas
│   │   ├── services/         # Business logic
│   │   ├── controllers/      # Request handlers
│   │   ├── utils/            # Helper functions
│   │   ├── python/           # Python scripts (MediaPipe)
│   │   ├── uploads/          # Temporary file storage
│   │   ├── server.js         # Express server
│   │   └── package.json      # Dependencies
│
└── 📚 DOCUMENTATION
    ├── APK_BUILD_GUIDE.md
    ├── EXPO_COMPATIBILITY.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── POSE_CORRECTION_IMPLEMENTATION.md
    ├── TESTING_GUIDE.md
    └── WINDOWS_SETUP_GUIDE.md
```

---

## 🎯 Core Features & Flow

### 1️⃣ **User Authentication Flow**
```
LoginScreen → Register/Login API → JWT Token → Dashboard
```

**Files Involved:**
- `src/Screens/LoginScreen.jsx`
- `src/Screens/RegisterScreen.jsx`
- `backend/server.js` (lines 100-213)
- `backend/models/User` (embedded in server.js)

### 2️⃣ **Emotion Detection Flow**
```
Dashboard → Video Upload → Multimodal Analysis → Emotion Insight → Yoga Recommendation
```

**Flow Diagram:**
```
┌──────────────┐
│  Dashboard   │
└──────┬───────┘
       │ User uploads video
       ↓
┌──────────────────┐
│  VideoEmotion    │ (src/Screens/VideoEmotion.jsx)
└──────┬───────────┘
       │ POST /api/emotion/video
       ↓
┌──────────────────────────────────────────┐
│  Backend: VideoEmotion.js Route          │
│  - Extract audio (FFmpeg)                │
│  - Extract frames (FFmpeg)               │
│  - Send to multimodal endpoint           │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Multimodal Analysis                     │
│  ┌────────────┐  ┌────────────┐         │
│  │ Face (FER) │  │ Voice(SER) │         │
│  └────────────┘  └────────────┘         │
│  ┌────────────┐                          │
│  │ Text (STT) │                          │
│  └────────────┘                          │
└──────┬───────────────────────────────────┘
       │
       ↓ Conflict Detection
       │
   ┌───┴────┐
   │        │
   ↓        ↓
Fusion   LLM Questions
   │        │
   │        ↓
   │   Questionnaire
   │        │
   └────┬───┘
        │
        ↓
┌──────────────────┐
│ EmotionInsight   │ (src/Screens/EmotionInsightscreen.jsx)
└──────┬───────────┘
       │ Fetch yoga plan
       ↓
┌──────────────────┐
│ Yoga Session     │ (src/Screens/YogaSessionScreen.jsx)
└──────────────────┘
```

### 3️⃣ **Yoga Session Flow**
```
Emotion Insight → Yoga Plan → Video Tutorial → Live Pose Detection → Feedback → Session Complete
```

**Flow Diagram:**
```
┌─────────────────┐
│ EmotionInsight  │
└────────┬────────┘
         │ POST /api/yoga/recommend
         ↓
┌─────────────────────────────────┐
│ Backend: Yoga Recommendation    │
│ - Get emotion-based poses       │
│ - Create session in DB          │
│ - Return yoga plan              │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────┐
│ YogaSession     │
│ ┌─────────────┐ │
│ │ Video Watch │ │ (YouTube tutorial)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Camera View │ │ (Live pose detection)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Feedback UI │ │ (Real-time corrections)
│ └─────────────┘ │
└────────┬────────┘
         │ Capture frame every 3s
         ↓
┌─────────────────────────────────┐
│ POST /api/pose/analyze          │
│ - Detect landmarks (MediaPipe)  │
│ - Validate against template     │
│ - Calculate score & feedback    │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────┐
│ Update UI       │
│ - Score         │
│ - Feedback      │
│ - Hold duration │
└─────────────────┘
```

---

## 🗂️ File Reference Map

### **Frontend Screens** (`src/Screens/`)

| File | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| `LoginScreen.jsx` | User login | Email/password auth, JWT storage | AsyncStorage, axios |
| `RegisterScreen.jsx` | User registration | Form validation, profile creation | AsyncStorage, axios |
| `Dashboard.jsx` | Main hub | Emotion detection entry, user profile | Audio, ImagePicker |
| `VideoEmotion.jsx` | Video upload | Record/upload video for analysis | ImagePicker, Camera |
| `QuestionnaireScreen.jsx` | LLM questions | Resolve emotion conflicts | Navigation |
| `EmotionInsightscreen.jsx` | Results display | Show emotion analysis, yoga plan | AsyncStorage, axios |
| `YogaSessionScreen.jsx` | Yoga practice | Video tutorial, live pose detection | Camera, YouTube, ImageManipulator |
| `Yogalistscreen.jsx` | Pose list | Browse available yoga poses | ScrollView |
| `Feedbackscreen.jsx` | Session feedback | Rate session, provide feedback | AsyncStorage |

### **Frontend Hooks** (`src/hooks/`)

| File | Purpose | Exports |
|------|---------|---------|
| `usePoseDetection.js` | Pose detection logic | `usePoseDetection`, `useContinuousPoseDetection`, `useBackendPoseDetection`, `useMockPoseDetection` |

### **Frontend Utils** (`src/utils/`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `poseTemplates.js` | Pose reference data | `poseTemplates`, `getPoseTemplate()`, `getAllPoseNames()` |
| `poseUtils.js` | Pose calculations | `smoothScore()`, angle calculations |

### **Backend Routes** (`backend/routes/`)

| File | Endpoint | Purpose | Methods |
|------|----------|---------|---------|
| `ser.js` | `/api/emotion/voice` | Speech Emotion Recognition | POST |
| `ster.js` | `/api/emotion/voicetext` | Speech-to-Text + Emotion | POST |
| `multimodal.js` | `/api/emotion/multimodal` | Fuse face/voice/text | POST |
| `face.js` | `/api/emotion/face` | Facial Emotion Recognition | POST |
| `VideoEmotion.js` | `/api/emotion/video` | Video processing (audio+frames) | POST |
| `resolveEmotion.js` | `/api/emotion/resolve` | LLM questionnaire resolution | POST |
| `yoga.js` | `/api/yoga/recommend` | Get personalized yoga plan | POST |
| `youtube.js` | `/api/yoga/youtube` | Fetch YouTube tutorial | GET |
| `pose.js` | `/api/pose/*` | Pose detection & validation | POST, GET |
| `updatepose.js` | `/api/session/update-pose` | Update session pose data | POST |
| `session.js` | `/api/session/*` | Session CRUD operations | POST, GET, PUT |

### **Backend Models** (`backend/models/`)

| File | Schema | Key Fields |
|------|--------|------------|
| `Session.js` | Session tracking | `userId`, `emotion`, `yogaPlan`, `poseHistory`, `completed`, `rating` |
| `UserProfile.js` | User preferences | `userId`, `preferences`, `history` |
| User (in `server.js`) | Authentication | `name`, `email`, `password`, `age`, `gender`, `yogaExperience` |

### **Backend Services** (`backend/services/`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `posedetection.js` | **Enhanced** MediaPipe integration with range-based validation | `detectPoseFromImage()`, `validatePose()`, `compareAnglesWithRanges()`, `applySmoothingToAngles()`, `resetAngleHistory()` |
| `yogarecommendation.js` | Yoga plan generation | `recommendYoga()` |
| `userprofile.js` | User profile management | Profile CRUD operations |

### **Backend Utils** (`backend/utils/`)

| File | Purpose | Exports |
|------|---------|---------|
| `poseTemplates.js` | Pose reference angles | `poseTemplates` object |
| `yogapose.js` | Emotion-to-pose mapping | Pose arrays by emotion |
| `fusion.js` | Multimodal fusion logic | `fuseEmotions()` |
| `llmQuestions.js` | LLM question generation | `generateQuestions()`, `getQuestions()`, `deleteSession()` |
| `emotionMap.js` | Emotion normalization | `normalizeEmotion()` |

---

## 🔌 API Endpoints Reference

### **Authentication**
```
POST /api/register          - Create new user
POST /api/login             - User login
GET  /api/profile           - Get user profile (protected)
GET  /api/health            - Health check
```

### **Emotion Detection**
```
POST /api/emotion/voice         - Speech Emotion Recognition (SER)
POST /api/emotion/voicetext     - Speech-to-Text + Text Emotion
POST /api/emotion/face          - Facial Emotion Recognition (FER)
POST /api/emotion/multimodal    - Multimodal fusion (face+voice+text)
POST /api/emotion/video         - Video analysis (extracts audio+frames)
POST /api/emotion/resolve       - Resolve emotion via LLM questionnaire
```

### **Yoga & Pose**
```
POST /api/yoga/recommend        - Get personalized yoga plan
GET  /api/yoga/youtube?pose=X   - Get YouTube tutorial for pose
POST /api/pose/detect           - Detect pose from image
POST /api/pose/validate         - Validate pose against template
POST /api/pose/analyze          - Full pose analysis
GET  /api/pose/templates        - Get all pose templates
GET  /api/pose/template/:id     - Get specific pose template
```

### **Session Management**
```
POST /api/session/update-pose   - Update pose tracking in session
GET  /api/session/:id           - Get session details
PUT  /api/session/:id           - Update session
```

---

## 🧩 Key Data Structures

### **Emotion Analysis Result**
```javascript
{
  face: { emotion: "happy", confidence: 0.85 },
  voice: { emotion: "neutral", confidence: 0.72 },
  text: { emotion: "sad", confidence: 0.68 },
  final: {
    final_emotion: "happy",
    confidence: 0.78,
    fusion_strategy: "weighted_fusion",
    modalities_used: ["face", "voice", "text"]
  }
}
```

### **Yoga Plan**
```javascript
[
  { id: "balasana", duration: 60, intensity: "low" },
  { id: "sukhasana", duration: 90, intensity: "low" }
]
```

### **Pose Validation Result**
```javascript
{
  valid: true,
  score: 85,
  feedback: {
    overall: "Great form!",
    details: [
      { joint: "leftKnee", message: "Perfect angle", severity: "success" }
    ]
  },
  angles: {
    leftKnee: 178,
    rightKnee: 180,
    spine: 175
  }
}
```

### **Session Schema**
```javascript
{
  userId: ObjectId,
  emotion: "stressed",
  yogaPlan: [...],
  poseHistory: [
    {
      poseId: "balasana",
      timestamp: Date,
      score: 85,
      feedback: [...],
      angles: {...},
      duration: 45
    }
  ],
  completed: true,
  completionRatio: 0.9,
  rating: 4,
  averagePoseScore: 82,
  totalPosesCompleted: 5
}
```

---

## 🔄 State Management Patterns

### **Frontend State (React)**
- **Local State**: `useState` for component-specific data
- **Refs**: `useRef` for intervals, camera refs, latest values
- **Async Storage**: User data, tokens, preferences
- **Navigation Params**: Pass data between screens

### **Backend State**
- **MongoDB**: Persistent data (users, sessions)
- **In-Memory Maps**: Temporary data (LLM question sessions)
- **File System**: Temporary uploads (auto-cleanup)

---

## 🎨 Pose Templates

**Available Poses:**
1. `balasana` - Child's Pose (calming)
2. `sukhasana` - Easy Pose (meditation)
3. `vrikshasana` - Tree Pose (balance)
4. `tadasana` - Mountain Pose (grounding)
5. `setu_bandha` - Bridge Pose (energizing)
6. `uttanasana` - Forward Bend (stress relief)
7. `pranayama` - Breathing Exercise (anxiety)
8. `legs_up_wall` - Legs Up Wall (relaxation)

**Emotion-to-Pose Mapping:**
- **Calm**: balasana, sukhasana
- **Happy**: vrikshasana, tadasana
- **Sad**: setu_bandha, balasana
- **Angry**: uttanasana, pranayama
- **Fearful**: legs_up_wall
- **Neutral**: sukhasana

---

## 🔧 Technology Stack

### **Frontend**
- React Native 0.81.5
- Expo SDK 54
- React Navigation 6
- React Native Paper (UI)
- Expo Camera, AV, Image Picker
- YouTube Iframe Player
- MediaPipe Pose (web)

### **Backend**
- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- FFmpeg (video processing)
- Axios (HTTP client)
- Groq SDK (LLM)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)

### **External APIs**
- Hugging Face (SER, FER models)
- Groq (LLM for questionnaires)
- YouTube Data API (tutorials)
- MediaPipe (pose detection - Python)

---

## 🚀 Deployment Configuration

### **Frontend (Expo)**
- Build: EAS Build
- Config: `eas.json`
- Platforms: Android, iOS
- APK: See `APK_BUILD_GUIDE.md`

### **Backend**
- Server: Node.js Express
- Port: 5001 (default)
- Environment: `.env` file
- Database: MongoDB Atlas/Local

---

## 📝 Common Modification Patterns

### **Adding a New Emotion**
1. Update `backend/utils/emotionMap.js`
2. Add pose mapping in `backend/utils/yogapose.js`
3. Update fusion weights if needed in `backend/utils/fusion.js`

### **Adding a New Pose**
1. Add template to `src/utils/poseTemplates.js`
2. Add template to `backend/utils/poseTemplates.js`
3. Add to emotion mapping in `backend/utils/yogapose.js`
4. Create YouTube tutorial mapping

### **Modifying Pose Detection**
1. Update `backend/services/posedetection.js`
2. Adjust angle calculations
3. Update validation thresholds in templates

### **Changing UI Flow**
1. Modify navigation in `App.js`
2. Update screen components
3. Adjust route params passed between screens

---

## 🐛 Debugging Reference

### **Common Issues & Files**
- **Camera not working**: Check `src/Screens/YogaSessionScreen.jsx` permissions
- **Pose detection fails**: Check `backend/services/posedetection.js` and Python script
- **Video upload fails**: Check `backend/routes/VideoEmotion.js` FFmpeg paths
- **Emotion conflict**: Check `backend/utils/fusion.js` and `backend/utils/llmQuestions.js`
- **Session not saving**: Check `backend/models/Session.js` and `backend/routes/session.js`

### **Log Locations**
- Frontend: React Native debugger, console.log
- Backend: Terminal output, console.log/error
- Database: MongoDB logs

---

## 📊 Performance Considerations

### **Frontend**
- Camera frame processing: 3-second intervals (reduce shutter sound)
- Image compression: 0.7 quality for uploads
- Lazy loading: Components load on demand

### **Backend**
- File cleanup: Auto-delete after 5 seconds
- Connection pooling: MongoDB default
- Request timeout: 60 seconds for ML APIs

---

## 🔐 Security Notes

- JWT tokens for authentication
- Password hashing with bcryptjs (12 rounds)
- File upload validation (type, size)
- CORS enabled for all origins (development)
- Environment variables for sensitive data

---

## 📚 Documentation Files

- `APK_BUILD_GUIDE.md` - Android build instructions
- `EXPO_COMPATIBILITY.md` - Expo SDK compatibility
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation details
- `POSE_CORRECTION_IMPLEMENTATION.md` - Pose detection system (legacy)
- `ENHANCED_POSE_DETECTION.md` - **NEW: Enhanced range-based pose validation system**
- `TESTING_GUIDE.md` - Testing procedures
- `WINDOWS_SETUP_GUIDE.md` - Windows development setup
- `PROJECT_ARCHITECTURE_GRAPH.md` - This file (complete project reference)

---

## 🎯 Future Reference Quick Links

**When modifying:**
- **Authentication**: `backend/server.js` (lines 46-213)
- **Emotion Detection**: `backend/routes/multimodal.js`, `backend/routes/VideoEmotion.js`
- **Yoga Recommendations**: `backend/services/yogarecommendation.js`, `backend/utils/yogapose.js`
- **Pose Detection**: `backend/services/posedetection.js`, `backend/routes/pose.js`
- **UI Screens**: `src/Screens/` directory
- **Pose Templates**: `src/utils/poseTemplates.js`, `backend/utils/poseTemplates.js`

---

**Last Updated**: 2026-05-09  
**Version**: 1.0.0  
**Generated by**: Bob (Senior Developer AI)

---

*This document serves as a comprehensive reference to minimize token usage in future conversations. Refer to specific sections when making changes to the project.*