# Windows Setup Guide - MindEase

This guide covers the Windows setup that matches the current project behavior, including the Python virtual environment, OpenCV, MediaPipe, and the required pose model file.

## What This Setup Does

After setup is complete:

- The backend uses the Python virtual environment at `backend\python\venv`
- OpenCV and MediaPipe are installed inside that virtual environment
- The MediaPipe pose model file is stored at `backend\python\models\pose_landmarker_lite.task`
- The backend can use real MediaPipe pose detection instead of mock fallback data

## Prerequisites

Install these before starting:

1. Python 3.10 or 3.11
   Download: https://www.python.org/downloads/windows/
   During install, enable `Add Python to PATH`

2. Node.js 18+
   Download: https://nodejs.org/

3. PowerShell or Command Prompt

## Project Paths

Important paths used by this setup:

- App root: `C:\React Native Projects\MindEase`
- Python setup folder: `C:\React Native Projects\MindEase\backend\python`
- Python interpreter used by backend: `C:\React Native Projects\MindEase\backend\python\venv\Scripts\python.exe`
- MediaPipe model file: `C:\React Native Projects\MindEase\backend\python\models\pose_landmarker_lite.task`

## Recommended Setup

From the project root:

```powershell
cd "C:\React Native Projects\MindEase\backend\python"
.\setup.bat
```

This script will:

- create `venv` if it does not exist
- upgrade `pip`
- install Python requirements
- create the `models` folder
- download the MediaPipe pose model file
- run a healthcheck

## Manual Setup

If you prefer to run setup manually:

```powershell
cd "C:\React Native Projects\MindEase\backend\python"
python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
New-Item -ItemType Directory -Force -Path models
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" `
  -OutFile "models\pose_landmarker_lite.task"
```

## Verification

Run these from `backend\python`:

```powershell
.\venv\Scripts\python.exe -c "import mediapipe; print('MediaPipe OK')"
.\venv\Scripts\python.exe -c "import cv2; print('OpenCV OK')"
.\venv\Scripts\python.exe pose_detector.py --healthcheck
```

Expected result:

```text
MediaPipe OK
OpenCV OK
{"success": true, "ready": true}
```

If you run:

```powershell
python -c "import cv2; print('OpenCV OK')"
```

and it fails, that usually means you are using the system Python instead of the project virtual environment. Use:

```powershell
.\venv\Scripts\python.exe -c "import cv2; print('OpenCV OK')"
```

or activate the venv first:

```powershell
.\venv\Scripts\Activate.ps1
python -c "import cv2; print('OpenCV OK')"
```

## Start the Backend

From the backend folder:

```powershell
cd "C:\React Native Projects\MindEase\backend"
npm install
npm start
```

Expected backend logs:

```text
Using virtual environment Python (Windows)
MediaPipe pose detection initialized (Python)
Server running on port 5000
```

If you instead see:

```text
Using fallback pose detection (mock data)
```

then the backend is not using real MediaPipe data.

## Start the Frontend

From the app root:

```powershell
cd "C:\React Native Projects\MindEase"
npm install
npm start
```

## Common Issues

### 1. `python` is not recognized

Reinstall Python and enable `Add Python to PATH`.

Check:

```powershell
python --version
```

### 2. `cv2` or `mediapipe` module not found

Use the venv interpreter:

```powershell
.\venv\Scripts\python.exe -m pip list
.\venv\Scripts\python.exe -c "import cv2; print('OpenCV OK')"
```

### 3. Healthcheck says MediaPipe is not ready

Check that the model file exists:

```powershell
dir .\models\
```

You should see:

```text
pose_landmarker_lite.task
```

Then run:

```powershell
.\venv\Scripts\python.exe pose_detector.py --healthcheck
```

### 4. PowerShell blocks venv activation

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\venv\Scripts\Activate.ps1
```

### 5. Backend still falls back to mock data

Check all three:

1. `backend\python\venv\Scripts\python.exe` exists
2. `backend\python\models\pose_landmarker_lite.task` exists
3. `.\venv\Scripts\python.exe pose_detector.py --healthcheck` returns `{"success": true, "ready": true}`

## Rebuild the Python Setup

If you want a clean reinstall:

```powershell
cd "C:\React Native Projects\MindEase\backend\python"
rmdir /s /q venv
rmdir /s /q models
.\setup.bat
```

## Quick Checklist

- Python installed
- Node.js installed
- `backend\python\venv` created
- dependencies installed in the venv
- `backend\python\models\pose_landmarker_lite.task` downloaded
- `pose_detector.py --healthcheck` returns success
- backend starts without fallback warnings

## Notes About Real-Time Detection

The app uses real MediaPipe pose detection once setup succeeds, but the mobile screen does not process every video frame continuously. It captures an image periodically and sends it to the backend for analysis. That is expected for this implementation.
