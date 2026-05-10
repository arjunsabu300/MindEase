# MindEase Backend Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Python environment setup
FROM python:3.11-slim as python-builder

# Install system dependencies for MediaPipe and OpenCV
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgles2 \
    libegl1 \
    libgl1 \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
WORKDIR /app/python
COPY python/requirements.txt .
RUN python -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download MediaPipe model file
RUN . venv/bin/activate && \
    curl -L -o pose_landmarker_lite.task \
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

# Stage 2: Final image
FROM node:18-slim

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgles2 \
    libegl1 \
    libgl1 \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python environment from builder
COPY --from=python-builder /app/python /app/python

# Copy Python scripts
COPY python/*.py /app/python/

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV NODE_ENV=production
ENV PYTHON_PATH=/app/python/venv/bin/python3
ENV MEDIAPIPE_DISABLE_GPU=1
ENV GLOG_minloglevel=2

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5001/ || exit 1

# Start the application
CMD ["node", "server.js"]