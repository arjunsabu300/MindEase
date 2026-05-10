#!/bin/bash

# Render build script - Install system dependencies for MediaPipe
echo "📦 Installing system dependencies for MediaPipe..."

# Install OpenGL libraries required by MediaPipe
apt-get update
apt-get install -y \
    libgles2-mesa \
    libgles2-mesa-dev \
    libegl1-mesa \
    libegl1-mesa-dev \
    libgl1-mesa-glx \
    libgl1-mesa-dev

echo "✅ System dependencies installed"

# Now run the normal build
cd backend && npm install && cd python && chmod +x setup.sh && bash setup.sh && cd ../..

echo "✅ Build complete!"

# Made with Bob
