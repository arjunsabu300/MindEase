#!/bin/bash

# MediaPipe Setup Script
# This script installs all required Python packages for pose detection

echo "🚀 Setting up MediaPipe Pose Detection..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.8 or higher from https://www.python.org/"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed!"
    echo "Please install pip3"
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"
echo ""

# Create virtual environment (optional but recommended)
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # macOS/Linux
    source venv/bin/activate
fi

echo "✅ Virtual environment activated"
echo ""

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

echo ""

# Install requirements
echo "📥 Installing MediaPipe and dependencies..."
echo "This may take a few minutes..."
echo ""

pip install -r requirements.txt

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Installed packages:"
pip list | grep -E "mediapipe|opencv|numpy|Pillow"
echo ""
echo "🎉 MediaPipe is ready to use!"
echo ""
echo "To test the installation, run:"
echo "  python3 pose_detector.py <path_to_image>"
echo ""

# Made with Bob
