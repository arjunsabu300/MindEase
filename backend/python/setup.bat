@echo off
REM MediaPipe Setup Script for Windows
REM This script installs all required Python packages for pose detection

echo 🚀 Setting up MediaPipe Pose Detection for Windows...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo ✅ Python found
python --version
echo.

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not installed!
    echo Please install pip
    pause
    exit /b 1
)

echo ✅ pip found
pip --version
echo.

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo ✅ Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

echo.

REM Install requirements
echo 📥 Installing MediaPipe and dependencies...
echo This may take a few minutes...
echo.

pip install -r requirements.txt

echo.
echo ✅ Installation complete!
echo.
echo 📝 Installed packages:
pip list | findstr /I "mediapipe opencv numpy Pillow"
echo.
echo 🎉 MediaPipe is ready to use!
echo.
echo To test the installation, run:
echo   python pose_detector.py ^<path_to_image^>
echo.
pause

@REM Made with Bob
