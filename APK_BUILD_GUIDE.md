# APK Build & Mobile Deployment Guide

## Overview
This guide covers building the MindEase app for mobile devices (APK for Android and IPA for iOS) and the differences between Expo testing and production builds.

## Expo vs Production Build

### Current Setup (Expo Go)
- ✅ **Testing**: Works perfectly with Expo Go
- ✅ **Development**: Fast iteration and testing
- ❌ **Distribution**: Cannot be published to app stores
- ❌ **Standalone**: Requires Expo Go app to run

### Production Build (APK/IPA)
- ✅ **Standalone**: Runs independently without Expo Go
- ✅ **App Stores**: Can be published to Google Play/App Store
- ✅ **Performance**: Better performance and smaller size
- ✅ **Distribution**: Can be shared as APK file

## Changes Needed for Production

### 1. No Code Changes Required! ✅
The current implementation works for both Expo Go and production builds without any code modifications.

### 2. Configuration Updates

#### Update `app.json`:
```json
{
  "expo": {
    "name": "MindEase",
    "slug": "mindease",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFF8F3"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.mindease",
      "infoPlist": {
        "NSCameraUsageDescription": "MindEase needs camera access for yoga pose detection and emotion analysis.",
        "NSMicrophoneUsageDescription": "MindEase needs microphone access for voice emotion detection."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFF8F3"
      },
      "package": "com.yourcompany.mindease",
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow MindEase to access your camera for pose detection and emotion analysis."
        }
      ]
    ]
  }
}
```

### 3. Backend URL Configuration

For production, update the API URL to use your deployed backend:

```javascript
// src/Screens/YogaSessionScreen.jsx
// Development
const API_URL = "http://192.168.1.5:5000";

// Production (update to your deployed backend)
const API_URL = "https://your-backend-domain.com";
```

**Best Practice**: Use environment variables:
```javascript
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || "http://192.168.1.5:5000";
```

Then in `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-backend-domain.com"
    }
  }
}
```

## Building APK (Android)

### Method 1: EAS Build (Recommended)

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure EAS
```bash
eas build:configure
```

This creates `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### Step 4: Build APK
```bash
# For testing (APK)
eas build --platform android --profile preview

# For production (AAB for Play Store)
eas build --platform android --profile production
```

#### Step 5: Download APK
- Build will be uploaded to Expo servers
- You'll get a download link
- Share APK with testers or install on device

**Build Time**: 10-20 minutes
**Cost**: Free for limited builds, paid plans available

### Method 2: Local Build (Advanced)

#### Step 1: Install Android Studio
Download from: https://developer.android.com/studio

#### Step 2: Prebuild
```bash
npx expo prebuild --platform android
```

This creates `android/` directory with native code.

#### Step 3: Build APK
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

#### Step 4: Sign APK (for distribution)
```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.keystore android/app/build/outputs/apk/release/app-release.apk my-key-alias
```

## Building IPA (iOS)

### Requirements
- macOS computer
- Apple Developer Account ($99/year)
- Xcode installed

### Method 1: EAS Build (Recommended)

```bash
# Build for testing (simulator)
eas build --platform ios --profile development

# Build for TestFlight
eas build --platform ios --profile production
```

### Method 2: Local Build

```bash
# Prebuild
npx expo prebuild --platform ios

# Open in Xcode
cd ios
open MindEase.xcworkspace

# Build in Xcode
# Product > Archive > Distribute App
```

## Testing Production Build

### Android APK Testing

1. **Enable Unknown Sources**:
   - Settings > Security > Unknown Sources (Enable)

2. **Install APK**:
   ```bash
   # Via ADB
   adb install app-release.apk
   
   # Or transfer to device and tap to install
   ```

3. **Test All Features**:
   - Camera access
   - Emotion detection
   - Yoga recommendations
   - Pose correction
   - Session tracking

### iOS IPA Testing

1. **TestFlight** (Recommended):
   - Upload to App Store Connect
   - Add testers via email
   - They install via TestFlight app

2. **Ad-Hoc Distribution**:
   - Register device UDIDs
   - Create provisioning profile
   - Install via Xcode or third-party tools

## Key Differences: Expo Go vs Production

### 1. Performance
- **Expo Go**: Slower, includes all Expo modules
- **Production**: Faster, only includes used modules

### 2. Size
- **Expo Go**: ~200MB (includes Expo runtime)
- **Production APK**: ~30-50MB (optimized)

### 3. Updates
- **Expo Go**: Instant updates via Expo
- **Production**: Requires app store updates (or use Expo Updates)

### 4. Features
- **Expo Go**: Limited to Expo SDK
- **Production**: Can add custom native modules

### 5. Distribution
- **Expo Go**: Cannot distribute
- **Production**: Full distribution options

## Production Checklist

### Before Building:

- [ ] Update `app.json` with correct package names
- [ ] Set production API URL
- [ ] Add app icons (1024x1024 for iOS, various for Android)
- [ ] Add splash screen
- [ ] Configure permissions properly
- [ ] Test all features in Expo Go
- [ ] Remove console.log statements
- [ ] Enable error tracking (Sentry)
- [ ] Set up analytics

### Backend Deployment:

- [ ] Deploy backend to cloud (AWS, Heroku, DigitalOcean)
- [ ] Set up MongoDB Atlas or managed database
- [ ] Configure HTTPS/SSL
- [ ] Set environment variables
- [ ] Enable CORS for production domain
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Backup database regularly

### After Building:

- [ ] Test APK on multiple devices
- [ ] Test all camera features
- [ ] Test network connectivity
- [ ] Test offline behavior
- [ ] Check battery usage
- [ ] Verify permissions work
- [ ] Test on different Android versions
- [ ] Get feedback from beta testers

## Deployment Options

### 1. Google Play Store (Android)

**Requirements**:
- Google Play Developer Account ($25 one-time)
- App Bundle (AAB) file
- Privacy policy
- App screenshots and description

**Steps**:
1. Create app in Play Console
2. Upload AAB file
3. Fill in store listing
4. Set up pricing and distribution
5. Submit for review

**Review Time**: 1-7 days

### 2. Apple App Store (iOS)

**Requirements**:
- Apple Developer Account ($99/year)
- IPA file
- Privacy policy
- App screenshots and description

**Steps**:
1. Create app in App Store Connect
2. Upload IPA via Xcode or Transporter
3. Fill in app information
4. Submit for review

**Review Time**: 1-3 days

### 3. Direct Distribution (APK)

**For Android Only**:
- Share APK file directly
- Users install via "Unknown Sources"
- Good for beta testing
- No app store fees

**Limitations**:
- Users must enable unknown sources
- No automatic updates
- Less trust from users

## Over-The-Air (OTA) Updates

### Expo Updates (Recommended)

Update app without app store submission:

```bash
# Install
npm install expo-updates

# Configure in app.json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]"
    }
  }
}

# Publish update
eas update --branch production
```

**What can be updated**:
- ✅ JavaScript code
- ✅ Assets (images, etc.)
- ✅ Bug fixes
- ✅ UI changes

**What requires new build**:
- ❌ Native code changes
- ❌ New permissions
- ❌ SDK version updates

## Cost Breakdown

### Free Options:
- ✅ Expo Go testing
- ✅ Local builds (requires setup)
- ✅ Direct APK distribution

### Paid Options:
- **EAS Build**: Free tier available, then $29/month
- **Google Play**: $25 one-time
- **Apple Developer**: $99/year
- **Backend Hosting**: $5-50/month (varies)

## Recommended Workflow

### Phase 1: Development (Current)
```
Expo Go → Test features → Iterate quickly
```

### Phase 2: Beta Testing
```
EAS Build (Preview) → APK → Share with testers → Gather feedback
```

### Phase 3: Production
```
EAS Build (Production) → App Stores → Public release
```

### Phase 4: Updates
```
Expo Updates → Push fixes → No app store review needed
```

## Common Issues & Solutions

### Issue 1: Camera not working in production
**Solution**: Verify permissions in `app.json` and test on physical device

### Issue 2: Network requests failing
**Solution**: Update API_URL to production backend, check CORS settings

### Issue 3: APK size too large
**Solution**: 
- Enable Hermes engine
- Remove unused dependencies
- Optimize images

### Issue 4: Build fails
**Solution**:
- Check `eas.json` configuration
- Verify all dependencies are compatible
- Check EAS build logs

### Issue 5: App crashes on startup
**Solution**:
- Check native logs: `adb logcat`
- Verify all required permissions
- Test on multiple devices

## Performance Optimization

### For Production Build:

1. **Enable Hermes** (JavaScript engine):
```json
{
  "expo": {
    "android": {
      "jsEngine": "hermes"
    }
  }
}
```

2. **Optimize Images**:
```bash
# Install image optimizer
npm install -g sharp-cli

# Optimize
sharp -i input.png -o output.png --quality 80
```

3. **Code Splitting**:
```javascript
// Lazy load screens
const YogaSessionScreen = React.lazy(() => import('./Screens/YogaSessionScreen'));
```

4. **Remove Dev Dependencies**:
```bash
npm prune --production
```

## Conclusion

### Summary:
- ✅ **No code changes needed** for production build
- ✅ **Works in both** Expo Go and production
- ✅ **Easy to build** with EAS
- ✅ **Can distribute** via app stores or direct APK
- ✅ **OTA updates** supported for quick fixes

### Next Steps:
1. Test thoroughly in Expo Go
2. Build preview APK with EAS
3. Test on multiple devices
4. Deploy backend to production
5. Build production version
6. Submit to app stores

### Support:
- Expo Documentation: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- React Native: https://reactnative.dev

---

**Ready to build?** Start with `eas build --platform android --profile preview` for your first APK! 🚀