#!/bin/bash

# Render build script for MediaPipe
# Root directory is 'backend' on Render
echo "📦 Building MindEase backend with MediaPipe support..."

# Install Node.js dependencies
echo "📥 Installing Node.js packages..."
npm install

# Set up Python environment and MediaPipe
echo "🐍 Setting up Python environment..."
cd python
chmod +x setup.sh
bash setup.sh
cd ..

echo "✅ Build complete!"
echo "Note: Using opencv-python-headless for headless server compatibility"

# Made with Bob
