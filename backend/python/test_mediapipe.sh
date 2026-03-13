#!/bin/bash

echo "🔍 Testing MediaPipe Installation..."
echo ""

# Activate virtual environment
if [ -d "venv" ]; then
    echo "✅ Virtual environment found"
    source venv/bin/activate
    echo "✅ Virtual environment activated"
    echo ""
    
    # Test MediaPipe
    echo "📦 Testing MediaPipe import..."
    python3 -c "import mediapipe; print('✅ MediaPipe OK!')"
    
    echo ""
    echo "📦 Testing OpenCV import..."
    python3 -c "import cv2; print('✅ OpenCV OK!')"
    
    echo ""
    echo "📦 Testing NumPy import..."
    python3 -c "import numpy; print('✅ NumPy OK!')"
    
    echo ""
    echo "📦 Testing Pillow import..."
    python3 -c "from PIL import Image; print('✅ Pillow OK!')"
    
    echo ""
    echo "🎉 All packages working!"
    echo ""
    echo "Python path: $(which python3)"
    echo "MediaPipe version: $(python3 -c 'import mediapipe; print(mediapipe.__version__)')"
    
else
    echo "❌ Virtual environment not found!"
    echo "Run: bash setup.sh"
fi
