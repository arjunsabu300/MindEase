@echo off
setlocal

echo Setting up MediaPipe pose detection for Windows...
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found in PATH.
    echo Install Python 3.10 or 3.11 and enable "Add Python to PATH".
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo Virtual environment already exists.
)

echo Upgrading pip...
call venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 (
    echo [ERROR] Failed to upgrade pip.
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
call venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

if not exist models (
    mkdir models
)

if not exist models\pose_landmarker_lite.task (
    echo.
    echo Downloading MediaPipe pose model...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' -OutFile 'models\pose_landmarker_lite.task'"
    if errorlevel 1 (
        echo [ERROR] Failed to download pose_landmarker_lite.task.
        echo Download it manually and place it in backend\python\models\
        pause
        exit /b 1
    )
) else (
    echo MediaPipe pose model already exists.
)

echo.
echo Verifying installation...
call venv\Scripts\python.exe -c "import mediapipe; print('MediaPipe OK')"
if errorlevel 1 (
    echo [ERROR] MediaPipe verification failed.
    pause
    exit /b 1
)

call venv\Scripts\python.exe -c "import cv2; print('OpenCV OK')"
if errorlevel 1 (
    echo [ERROR] OpenCV verification failed.
    pause
    exit /b 1
)

call venv\Scripts\python.exe pose_detector.py --healthcheck
if errorlevel 1 (
    echo [ERROR] Pose detector healthcheck failed.
    pause
    exit /b 1
)

echo.
echo [OK] Windows setup completed successfully.
echo Use this interpreter for Python checks:
echo   venv\Scripts\python.exe
echo.
pause
