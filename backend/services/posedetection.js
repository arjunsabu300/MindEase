const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Pose Detection Service using MediaPipe
 * Enhanced with range-based validation for realistic pose correction
 * Accounts for camera shake, body tremors, and varying camera quality
 */

class PoseDetectionService {
  constructor() {
    this.initialized = false;
    this.initializationAttempted = false;
    this.initializationPromise = null;
    this.usingFallback = false;
    this.hasLoggedFallback = false;
    this.scriptPath = path.join(__dirname, '../python/pose_detector.py');
    this.healthcheckTimeoutMs = this.getPositiveIntegerEnv('MEDIAPIPE_HEALTHCHECK_TIMEOUT_MS', 60000);
    this.detectionTimeoutMs = this.getPositiveIntegerEnv('MEDIAPIPE_DETECTION_TIMEOUT_MS', 45000);
    this.usePersistentPython = process.env.MEDIAPIPE_PROCESS_PER_REQUEST !== 'true';
    this.pythonServer = null;
    this.pythonServerBuffer = '';
    this.pythonServerRequests = new Map();
    this.pythonServerRequestId = 0;
    
    // Temporal smoothing buffer for reducing jitter
    this.angleHistory = {};
    this.angleConfidenceHistory = {};
    this.lastAngleConfidences = {};
    this.lastPoseName = null;
    this.historySize = 3; // Keep last 3 frames for smoothing
    
    // Try to use Python in this order:
    // 1. Environment variable (for Render deployment)
    // 2. Virtual environment (local development)
    // 3. System Python (fallback)
    
    if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
      this.pythonPath = process.env.PYTHON_PATH;
      console.log('🐍 Using Python from PYTHON_PATH env:', this.pythonPath);
    } else {
      const venvPythonMac = path.join(__dirname, '../python/venv/bin/python3');
      const venvPythonWin = path.join(__dirname, '../python/venv/Scripts/python.exe');
      
      if (fs.existsSync(venvPythonMac)) {
        this.pythonPath = venvPythonMac;
        console.log('🐍 Using virtual environment Python (macOS/Linux)');
      } else if (fs.existsSync(venvPythonWin)) {
        this.pythonPath = venvPythonWin;
        console.log('🐍 Using virtual environment Python (Windows)');
      } else {
        this.pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        console.log('🐍 Using system Python (fallback)');
      }
    }
  }

  getPositiveIntegerEnv(name, defaultValue) {
    const value = Number.parseInt(process.env[name], 10);
    return Number.isFinite(value) && value > 0 ? value : defaultValue;
  }

  /**
   * Initialize the pose detection model
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationAttempted = true;
    this.initializationPromise = this.performInitialization()
      .finally(() => {
        this.initializationPromise = null;
      });

    return this.initializationPromise;
  }

  async performInitialization() {
    try {
      if (!fs.existsSync(this.scriptPath)) {
        console.warn('⚠️  Python MediaPipe script not found. Using fallback mode.');
        this.initialized = false;
        this.usingFallback = true;
        return;
      }

      const testResult = await this.testPythonMediaPipe();
      
      if (testResult.success) {
        this.initialized = true;
        this.usingFallback = false;
        if (this.usePersistentPython) {
          this.startPythonServer();
        }
        console.log('✅ MediaPipe pose detection initialized (Python)');
      } else {
        console.warn('⚠️  MediaPipe not available:', testResult.error);
        console.warn('⚠️  Using fallback pose detection.');
        this.initialized = false;
        this.usingFallback = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize pose detection:', error);
      this.initialized = false;
      this.usingFallback = true;
    }
  }

  /**
   * Test if Python MediaPipe is working
   */
  async testPythonMediaPipe() {
    return new Promise((resolve) => {
      console.log('🔍 Testing Python MediaPipe...');
      console.log('   Python path:', this.pythonPath);
      console.log('   Script path:', this.scriptPath);
      
      this.runPythonMediaPipe(['--healthcheck'], this.healthcheckTimeoutMs)
        .then(({ code, output, errorOutput }) => {
          console.log('   Exit code:', code);
          console.log('   Output:', output);
          const filteredErrorOutput = this.filterMediaPipeLogOutput(errorOutput);
          if (filteredErrorOutput) console.log('   Error output:', filteredErrorOutput);

          if (code !== 0) {
            resolve({
              success: false,
              error: filteredErrorOutput || output || `Healthcheck failed with exit code ${code}`,
            });
            return;
          }

          try {
            const result = JSON.parse(output);
            if (result.success && result.ready) {
              console.log('✅ MediaPipe test passed!');
              resolve({ success: true });
              return;
            }

            console.log('❌ MediaPipe test failed:', result.error);
            resolve({
              success: false,
              error: result.error || 'MediaPipe detector is not ready',
            });
          } catch (error) {
            console.log('❌ Failed to parse output:', error.message);
            resolve({
              success: false,
              error: filteredErrorOutput || output || `Healthcheck failed with exit code ${code}`,
            });
          }
        })
        .catch((error) => {
          console.log('❌ Process error:', error.message);
          resolve({ success: false, error: error.message });
        });
    });
  }

  /**
   * Run the Python MediaPipe script with timeout-safe child process handling
   */
  async runPythonMediaPipe(args, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonPath, [this.scriptPath, ...args], {
        env: this.getPythonEnv(),
      });

      let settled = false;
      let output = '';
      let errorOutput = '';
      let timeout;

      const finish = (callback, value) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        callback(value);
      };

      timeout = setTimeout(() => {
        finish(reject, new Error(`MediaPipe process timeout after ${timeoutMs}ms`));
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        finish(resolve, { code, output, errorOutput });
      });

      child.on('error', (error) => {
        finish(reject, error);
      });
    });
  }

  getPythonEnv() {
    return {
      ...process.env,
      TF_CPP_MIN_LOG_LEVEL: process.env.TF_CPP_MIN_LOG_LEVEL || '2',
      GLOG_minloglevel: process.env.GLOG_minloglevel || '2',
      MEDIAPIPE_DISABLE_GPU: process.env.MEDIAPIPE_DISABLE_GPU || '1',
    };
  }

  filterMediaPipeLogOutput(output) {
    if (!output) {
      return '';
    }

    return output
      .split(/\r?\n/)
      .filter(line => {
        const normalized = line.toLowerCase();
        return !(
          normalized.includes('gpu suport is not available') ||
          normalized.includes('gpu support is not available') ||
          normalized.includes('egl_initialized') ||
          normalized.includes('unable to initialize egl') ||
          normalized.includes('gl_context_egl') ||
          normalized.includes('all log messages before absl::initializelog')
        );
      })
      .join('\n')
      .trim();
  }

  startPythonServer() {
    if (this.pythonServer && !this.pythonServer.killed) {
      return;
    }

    console.log('🚀 Starting MediaPipe Python server...');
    this.pythonServerBuffer = '';
    this.pythonServer = spawn(this.pythonPath, [this.scriptPath, '--server'], {
      env: this.getPythonEnv(),
    });

    this.pythonServer.stdout.on('data', (data) => {
      this.pythonServerBuffer += data.toString();

      let newlineIndex = this.pythonServerBuffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = this.pythonServerBuffer.slice(0, newlineIndex).trim();
        this.pythonServerBuffer = this.pythonServerBuffer.slice(newlineIndex + 1);

        if (line) {
          this.handlePythonServerLine(line);
        }

        newlineIndex = this.pythonServerBuffer.indexOf('\n');
      }
    });

    this.pythonServer.stderr.on('data', (data) => {
      const message = this.filterMediaPipeLogOutput(data.toString());
      if (message) {
        console.log('MediaPipe server:', message);
      }
    });

    this.pythonServer.on('error', (error) => {
      console.error('❌ MediaPipe server error:', error);
      this.rejectAllPythonServerRequests(error);
      this.pythonServer = null;
      this.initialized = false;
    });

    this.pythonServer.on('close', (code) => {
      console.log(`⚠️ MediaPipe server closed with code ${code}`);
      this.rejectAllPythonServerRequests(new Error(`MediaPipe server exited with code ${code}`));
      this.pythonServer = null;
      // Don't set initialized to false here - let it restart on next request
    });
  }

  handlePythonServerLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      console.warn('Failed to parse MediaPipe server output:', line);
      return;
    }

    const pending = this.pythonServerRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pythonServerRequests.delete(message.id);
    pending.resolve(message);
  }

  rejectAllPythonServerRequests(error) {
    this.pythonServerRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(error);
    });
    this.pythonServerRequests.clear();
  }

  async callPersistentPythonMediaPipe(imagePath) {
    this.startPythonServer();

    if (!this.pythonServer || !this.pythonServer.stdin.writable) {
      throw new Error('MediaPipe server is not writable');
    }

    return new Promise((resolve, reject) => {
      const id = ++this.pythonServerRequestId;
      const timeout = setTimeout(() => {
        this.pythonServerRequests.delete(id);
        // DON'T kill the server on timeout - just reject this request
        // The server might be processing other requests or just slow
        console.warn(`⏱️ MediaPipe request ${id} timed out, but keeping server alive`);
        reject(new Error(`MediaPipe process timeout after ${this.detectionTimeoutMs}ms`));
      }, this.detectionTimeoutMs);

      this.pythonServerRequests.set(id, { resolve, reject, timeout });

      const request = JSON.stringify({ id, imagePath }) + '\n';
      this.pythonServer.stdin.write(request, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pythonServerRequests.delete(id);
          console.error('❌ Failed to write to MediaPipe server:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Parse the JSON response from the Python MediaPipe script
   */
  parsePythonResult(output, errorOutput) {
    try {
      return JSON.parse(output);
    } catch (error) {
      throw new Error(`Failed to parse MediaPipe output: ${errorOutput || output || error.message}`);
    }
  }

  /**
   * Detect pose from image file using Python MediaPipe
   */
  async detectPoseFromImage(imagePath) {
    await this.initialize();

    if (!this.initialized) {
      return this.fallbackDetection(imagePath);
    }

    try {
      const result = await this.callPythonMediaPipe(imagePath);

      if (result.success === false) {
        console.warn('MediaPipe detection failed, but continuing:', result.error);
        // Don't throw - return a "no pose detected" response instead
        return {
          success: true,
          detected: false,
          landmarks: null,
          message: 'No pose detected. Please adjust your position.',
          method: 'mediapipe'
        };
      }
      
      if (result.success && result.detected) {
        this.usingFallback = false;
        return {
          success: true,
          detected: true,
          landmarks: result.landmarks,
          imageWidth: result.imageWidth,
          imageHeight: result.imageHeight,
          timestamp: Date.now(),
          method: 'mediapipe'
        };
      } else {
        this.usingFallback = false;
        return {
          success: true,
          detected: false,
          landmarks: null,
          message: result.message || 'No pose detected',
          method: 'mediapipe'
        };
      }
    } catch (error) {
      console.error('MediaPipe detection error:', error);
      // DON'T kill the server on every error - it causes reinitialization freezing
      // Only restart if we detect the server is truly dead
      if (this.pythonServer && this.pythonServer.killed) {
        console.log('🔄 Python server was killed, will restart on next request');
        this.pythonServer = null;
        this.initialized = false;
      }
      return {
        success: true,
        detected: false,
        landmarks: null,
        message: 'Analyzing... Please hold your pose.',
        method: 'mediapipe'
      };
    }
  }

  /**
   * Call Python MediaPipe script
   */
  async callPythonMediaPipe(imagePath) {
    if (this.usePersistentPython) {
      return this.callPersistentPythonMediaPipe(imagePath);
    }

    const { code, output, errorOutput } = await this.runPythonMediaPipe(
      [imagePath],
      this.detectionTimeoutMs
    );

    if (code !== 0) {
      throw new Error(`MediaPipe process failed: ${errorOutput || output || `exit code ${code}`}`);
    }

    return this.parsePythonResult(output, errorOutput);
  }

  /**
   * Fallback detection when MediaPipe is not available
   */
  async fallbackDetection(imagePath) {
    if (!this.hasLoggedFallback) {
      console.log('⚠️  Using fallback pose detection (mock data)');
      this.hasLoggedFallback = true;
    }
    
    try {
      const image = await loadImage(imagePath);
      const landmarks = this.generateMockLandmarks();
      
      return {
        success: true,
        landmarks: landmarks,
        imageWidth: image.width,
        imageHeight: image.height,
        timestamp: Date.now(),
        method: 'fallback'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        landmarks: null
      };
    }
  }

  /**
   * Generate mock pose landmarks for testing
   */
  generateMockLandmarks() {
    const variation = () => (Math.random() - 0.5) * 0.05;
    
    const landmarks = [
      // 0-10: Face landmarks
      { x: 0.5 + variation(), y: 0.15 + variation(), z: 0, visibility: 0.99 },
      { x: 0.48 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.47 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.46 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.52 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.53 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.54 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 },
      { x: 0.44 + variation(), y: 0.16 + variation(), z: 0, visibility: 0.99 },
      { x: 0.56 + variation(), y: 0.16 + variation(), z: 0, visibility: 0.99 },
      { x: 0.48 + variation(), y: 0.18 + variation(), z: 0, visibility: 0.99 },
      { x: 0.52 + variation(), y: 0.18 + variation(), z: 0, visibility: 0.99 },
      
      // 11-12: Shoulders
      { x: 0.42 + variation(), y: 0.30 + variation(), z: 0, visibility: 0.99 },
      { x: 0.58 + variation(), y: 0.30 + variation(), z: 0, visibility: 0.99 },
      
      // 13-16: Arms
      { x: 0.38 + variation(), y: 0.45 + variation(), z: 0, visibility: 0.99 },
      { x: 0.62 + variation(), y: 0.45 + variation(), z: 0, visibility: 0.99 },
      { x: 0.35 + variation(), y: 0.60 + variation(), z: 0, visibility: 0.99 },
      { x: 0.65 + variation(), y: 0.60 + variation(), z: 0, visibility: 0.99 },
      
      // 17-22: Hands
      { x: 0.34 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 },
      { x: 0.33 + variation(), y: 0.61 + variation(), z: 0, visibility: 0.95 },
      { x: 0.32 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 },
      { x: 0.66 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 },
      { x: 0.67 + variation(), y: 0.61 + variation(), z: 0, visibility: 0.95 },
      { x: 0.68 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 },
      
      // 23-24: Hips
      { x: 0.45 + variation(), y: 0.65 + variation(), z: 0, visibility: 0.99 },
      { x: 0.55 + variation(), y: 0.65 + variation(), z: 0, visibility: 0.99 },
      
      // 25-28: Legs
      { x: 0.44 + variation(), y: 0.80 + variation(), z: 0, visibility: 0.99 },
      { x: 0.56 + variation(), y: 0.80 + variation(), z: 0, visibility: 0.99 },
      { x: 0.43 + variation(), y: 0.95 + variation(), z: 0, visibility: 0.99 },
      { x: 0.57 + variation(), y: 0.95 + variation(), z: 0, visibility: 0.99 },
      
      // 29-32: Feet
      { x: 0.42 + variation(), y: 0.98 + variation(), z: 0, visibility: 0.95 },
      { x: 0.58 + variation(), y: 0.98 + variation(), z: 0, visibility: 0.95 },
      { x: 0.41 + variation(), y: 0.99 + variation(), z: 0, visibility: 0.95 },
      { x: 0.59 + variation(), y: 0.99 + variation(), z: 0, visibility: 0.95 },
    ];
    
    return landmarks;
  }

  /**
   * Validate pose against reference template with enhanced range-based validation
   */
  validatePose(landmarks, referenceTemplate) {
    // Return score 0 if no landmarks detected
    if (!landmarks || landmarks.length === 0) {
      return {
        valid: false,
        score: 0,
        feedback: {
          overall: 'No person detected in camera. Please position yourself in view.',
          details: [{
            joint: 'detection',
            message: 'Step into camera view',
            severity: 'high'
          }]
        },
        angles: {},
        angleDetails: {}
      };
    }

    if (!referenceTemplate) {
      return {
        valid: false,
        score: 0,
        feedback: {
          overall: 'Unable to validate pose - no reference template',
          details: []
        }
      };
    }

    try {
      const poseName = referenceTemplate.name ?
        Object.keys(require('../utils/poseTemplates').poseTemplates).find(
          key => require('../utils/poseTemplates').poseTemplates[key].name === referenceTemplate.name
        ) : '';

      if (poseName && poseName !== this.lastPoseName) {
        this.resetAngleHistory();
        this.lastPoseName = poseName;
      }

      const userAngles = this.extractAngles(landmarks);
      const normalizedAngles = this.normalizePoseAngles(userAngles, poseName);
      
      // Check if angles were successfully extracted
      if (Object.keys(normalizedAngles).length === 0) {
        return {
          valid: false,
          score: 0,
          feedback: {
            overall: 'Unable to detect body joints. Please ensure full body is visible.',
            details: [{
              joint: 'visibility',
              message: 'Move back to show full body',
              severity: 'high'
            }]
          },
          angles: {},
          angleDetails: {}
        };
      }
      
      // Apply temporal smoothing to reduce jitter
      const smoothedAngles = this.applySmoothingToAngles(normalizedAngles);
      
      const comparison = this.compareAnglesWithRanges(smoothedAngles, referenceTemplate.keyAngles, poseName);
      
      return {
        valid: comparison.score >= 60,
        score: comparison.score,
        feedback: comparison.feedback,
        angles: smoothedAngles,
        angleDetails: comparison.angleDetails
      };
    } catch (error) {
      console.error('Pose validation error:', error);
      return {
        valid: false,
        score: 0,
        feedback: {
          overall: 'Validation error occurred',
          details: []
        }
      };
    }
  }

  /**
   * Apply temporal smoothing to angles to reduce jitter from camera shake
   */
  applySmoothingToAngles(currentAngles) {
    const smoothedAngles = {};
    
    Object.keys(currentAngles).forEach(key => {
      // Initialize history for this joint if not exists
      if (!this.angleHistory[key]) {
        this.angleHistory[key] = [];
      }
      
      // Add current angle to history
      this.angleHistory[key].push(currentAngles[key]);
      
      // Keep only last N frames
      if (this.angleHistory[key].length > this.historySize) {
        this.angleHistory[key].shift();
      }
      
      // Calculate moving average
      const sum = this.angleHistory[key].reduce((a, b) => a + b, 0);
      smoothedAngles[key] = sum / this.angleHistory[key].length;

      if (!this.angleConfidenceHistory[key]) {
        this.angleConfidenceHistory[key] = [];
      }

      this.angleConfidenceHistory[key].push(this.lastAngleConfidences[key] || 1);

      if (this.angleConfidenceHistory[key].length > this.historySize) {
        this.angleConfidenceHistory[key].shift();
      }

      const confidenceSum = this.angleConfidenceHistory[key].reduce((a, b) => a + b, 0);
      this.lastAngleConfidences[key] = confidenceSum / this.angleConfidenceHistory[key].length;
    });
    
    return smoothedAngles;
  }

  getLandmarkVisibility(landmark) {
    if (!landmark) {
      return 0;
    }
    return typeof landmark.visibility === 'number' ? landmark.visibility : 1;
  }

  canCalculateAngle(...points) {
    return points.every(point => this.getLandmarkVisibility(point) >= 0.35);
  }

  calculateVisibleAngle(key, pointA, pointB, pointC, angles) {
    if (!this.canCalculateAngle(pointA, pointB, pointC)) {
      return;
    }

    angles[key] = this.calculateAngle(pointA, pointB, pointC);
    this.lastAngleConfidences[key] = Math.min(
      this.getLandmarkVisibility(pointA),
      this.getLandmarkVisibility(pointB),
      this.getLandmarkVisibility(pointC)
    );
  }

  normalizePoseAngles(angles, poseName) {
    if (!angles) {
      return {};
    }

    const normalized = { ...angles };

    if (poseName === 'vrikshasana' && angles.leftKnee !== undefined && angles.rightKnee !== undefined) {
      const leftIsBent = angles.leftKnee < angles.rightKnee;
      normalized.standingKnee = leftIsBent ? angles.rightKnee : angles.leftKnee;
      normalized.bentKnee = leftIsBent ? angles.leftKnee : angles.rightKnee;
      this.lastAngleConfidences.standingKnee = leftIsBent
        ? this.lastAngleConfidences.rightKnee
        : this.lastAngleConfidences.leftKnee;
      this.lastAngleConfidences.bentKnee = leftIsBent
        ? this.lastAngleConfidences.leftKnee
        : this.lastAngleConfidences.rightKnee;

      if (leftIsBent && angles.leftHip !== undefined && angles.rightHip !== undefined) {
        const standingHipConfidence = this.lastAngleConfidences.rightHip;
        const bentHipConfidence = this.lastAngleConfidences.leftHip;
        normalized.leftHip = angles.rightHip;
        normalized.rightHip = angles.leftHip;
        this.lastAngleConfidences.leftHip = standingHipConfidence;
        this.lastAngleConfidences.rightHip = bentHipConfidence;
      }
    }

    return normalized;
  }

  /**
   * Extract angles from landmarks
   */
  extractAngles(landmarks) {
    const angles = {};
    this.lastAngleConfidences = {};

    try {
      this.calculateVisibleAngle('leftKnee', landmarks[23], landmarks[25], landmarks[27], angles);
      this.calculateVisibleAngle('rightKnee', landmarks[24], landmarks[26], landmarks[28], angles);
      this.calculateVisibleAngle('leftElbow', landmarks[11], landmarks[13], landmarks[15], angles);
      this.calculateVisibleAngle('rightElbow', landmarks[12], landmarks[14], landmarks[16], angles);
      this.calculateVisibleAngle('leftHip', landmarks[11], landmarks[23], landmarks[25], angles);
      this.calculateVisibleAngle('rightHip', landmarks[12], landmarks[24], landmarks[26], angles);
      this.calculateVisibleAngle('leftShoulder', landmarks[23], landmarks[11], landmarks[13], angles);
      this.calculateVisibleAngle('rightShoulder', landmarks[24], landmarks[12], landmarks[14], angles);

      // Spine angle
      if (!this.canCalculateAngle(landmarks[11], landmarks[12], landmarks[23], landmarks[24])) {
        return angles;
      }

      const midShoulder = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
      };
      const midHip = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2
      };
      
      const spineAngle = Math.atan2(
        midShoulder.x - midHip.x,
        midHip.y - midShoulder.y
      ) * (180 / Math.PI);
      angles.spine = 180 - Math.abs(spineAngle);
      this.lastAngleConfidences.spine = Math.min(
        this.getLandmarkVisibility(landmarks[11]),
        this.getLandmarkVisibility(landmarks[12]),
        this.getLandmarkVisibility(landmarks[23]),
        this.getLandmarkVisibility(landmarks[24])
      );

    } catch (error) {
      console.error('Error extracting angles:', error);
    }

    return angles;
  }

  /**
   * Calculate angle between three points
   */
  calculateAngle(pointA, pointB, pointC) {
    const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  /**
   * Check if user is attempting the pose (generic validation)
   * Detects if angles are significantly different from reference
   */
  checkCriticalPoseRequirements(poseName, userAngles, referenceAngles) {
    const criticalIssues = [];
    let criticalMismatches = 0;
    let totalCriticalJoints = 0;
    const mismatchDetails = [];
    
    // Check each reference angle to see if user is attempting the pose
    Object.keys(referenceAngles).forEach(key => {
      if (userAngles[key] !== undefined) {
        const reference = referenceAngles[key];
        const userAngle = userAngles[key];
        const targetAngle = reference.angle;
        const tolerance = reference.tolerance || 15;
        const diff = Math.abs(userAngle - targetAngle);
        
        // Critical joints that define the pose
        const criticalJoints = ['leftKnee', 'rightKnee', 'leftHip', 'rightHip', 'spine', 'bentKnee', 'standingKnee'];
        
        if (criticalJoints.includes(key)) {
          totalCriticalJoints++;
          
          // If angle is way off (more than 1.5x tolerance), it's a critical mismatch
          if (diff > tolerance * 1.5) {
            criticalMismatches++;
            mismatchDetails.push({
              joint: key,
              userAngle: Math.round(userAngle),
              targetAngle: targetAngle,
              diff: Math.round(diff),
              tolerance: tolerance
            });
          }
        }
      }
    });
    
    // Log for debugging
    const mismatchPercent = totalCriticalJoints > 0
      ? Math.round((criticalMismatches / totalCriticalJoints) * 100)
      : 0;
    if (totalCriticalJoints > 0 || criticalMismatches > 0) {
      console.log(`Pose Check: ${totalCriticalJoints} critical joints, ${criticalMismatches} mismatches (${mismatchPercent}%)`);
    }
    if (mismatchDetails.length > 0) {
      console.log('Mismatches:', mismatchDetails);
    }
    
    // If more than 70% of critical joints are way off, user is not attempting the pose
    // Made less strict to avoid false positives
    if (totalCriticalJoints > 0 && (criticalMismatches / totalCriticalJoints) > 0.7) {
      criticalIssues.push({
        message: 'Position yourself to match the pose. Watch the tutorial for guidance.',
        severity: 'critical'
      });
    }
    
    return criticalIssues;
  }

  /**
   * Compare user angles with reference angles using RANGE-BASED validation
   * This accounts for camera shake, body tremors, and varying camera quality
   */
  compareAnglesWithRanges(userAngles, referenceAngles, poseName = '') {
    let totalScore = 0;
    let weightedScore = 0;
    let totalWeight = 0;
    let count = 0;
    const feedback = [];
    const angleDetails = {};

    // Check critical pose requirements first (prevents false positives)
    const criticalIssues = this.checkCriticalPoseRequirements(poseName, userAngles, referenceAngles);
    
    // If critical requirements not met, return low score with specific feedback
    if (criticalIssues.length > 0) {
      return {
        score: 20, // Very low score for not attempting the pose
        feedback: criticalIssues, // Return as array for frontend
        feedbackSummary: {
          overall: 'Not in correct pose position',
          details: criticalIssues
        },
        angleDetails: {}
      };
    }

    // Joint importance weights (critical joints have higher weight)
    const jointWeights = {
      leftKnee: 1.2,
      rightKnee: 1.2,
      leftHip: 1.1,
      rightHip: 1.1,
      spine: 1.3,
      leftShoulder: 1.0,
      rightShoulder: 1.0,
      leftElbow: 0.9,
      rightElbow: 0.9,
      standingKnee: 1.3,
      bentKnee: 1.3
    };

    Object.keys(referenceAngles).forEach(key => {
      if (userAngles[key] !== undefined) {
        const reference = referenceAngles[key];
        const userAngle = userAngles[key];
        const targetAngle = reference.angle;
        const tolerance = reference.tolerance || 15;
        const weight = jointWeights[key] || 1.0;
        const confidence = this.lastAngleConfidences[key] || 1;

        if (confidence < 0.35) {
          feedback.push({
            joint: key,
            message: `${this.formatJointName(key)} is not clear in camera`,
            severity: 'medium',
          });
          return;
        }

        // Calculate angle difference
        const diff = Math.abs(userAngle - targetAngle);
        
        // Define LIBERAL RANGES for scoring (realistic and achievable)
        const minAcceptable = targetAngle - tolerance;
        const maxAcceptable = targetAngle + tolerance;
        const minGood = targetAngle - (tolerance * 0.6);
        const maxGood = targetAngle + (tolerance * 0.6);
        const minPerfect = targetAngle - (tolerance * 0.3);
        const maxPerfect = targetAngle + (tolerance * 0.3);

        // Calculate score based on LIBERAL ranges (0-100)
        let angleScore = 0;
        let status = 'poor';
        
        if (userAngle >= minPerfect && userAngle <= maxPerfect) {
          // Perfect range: 90-100 points (within 30% of tolerance)
          angleScore = 90 + (10 * (1 - (diff / (tolerance * 0.3))));
          status = 'perfect';
        } else if (userAngle >= minGood && userAngle <= maxGood) {
          // Good range: 75-90 points (within 60% of tolerance)
          const goodDiff = Math.min(
            Math.abs(userAngle - minGood),
            Math.abs(userAngle - maxGood)
          );
          angleScore = 75 + (15 * (1 - (goodDiff / (tolerance * 0.4))));
          status = 'good';
        } else if (userAngle >= minAcceptable && userAngle <= maxAcceptable) {
          // Acceptable range: 55-75 points (within full tolerance)
          const acceptableDiff = Math.min(
            Math.abs(userAngle - minAcceptable),
            Math.abs(userAngle - maxAcceptable)
          );
          angleScore = 55 + (20 * (1 - (acceptableDiff / tolerance)));
          status = 'acceptable';
        } else {
          // Outside acceptable range: 0-55 points (gradual penalty)
          const excessDiff = diff - tolerance;
          angleScore = Math.max(0, 55 - (excessDiff * 2.5));
          status = 'needs_adjustment';
        }

        // Apply weight to score
        const confidenceWeight = Math.max(0.5, Math.min(confidence, 1));
        weightedScore += angleScore * weight * confidenceWeight;
        totalWeight += weight * confidenceWeight;
        totalScore += angleScore;
        count++;

        // Store angle details
        angleDetails[key] = {
          current: Math.round(userAngle),
          target: targetAngle,
          diff: Math.round(diff),
          score: Math.round(angleScore),
          confidence: Math.round(confidence * 100),
          status: status,
          range: `${Math.round(minAcceptable)}-${Math.round(maxAcceptable)}°`
        };

        // Generate actionable feedback based on status
        if (status === 'needs_adjustment') {
          const severity = diff > tolerance * 2 ? 'high' : diff > tolerance * 1.5 ? 'medium' : 'low';
          const actionableMessage = this.generateActionableFeedback(key, userAngle - targetAngle, userAngle, targetAngle);
          
          feedback.push({
            joint: key,
            message: actionableMessage,
            severity: severity,
            current: Math.round(userAngle),
            target: targetAngle
          });
        } else if (status === 'acceptable') {
          const actionableMessage = this.generateActionableFeedback(key, userAngle - targetAngle, userAngle, targetAngle);
          
          feedback.push({
            joint: key,
            message: `${actionableMessage} - Almost there!`,
            severity: 'low',
            current: Math.round(userAngle),
            target: targetAngle
          });
        }
      }
    });

    const minimumRequiredJoints = Math.min(3, Math.ceil(Object.keys(referenceAngles).length * 0.6));
    if (count < minimumRequiredJoints) {
      return {
        score: 0,
        averageScore: 0,
        feedback: [{
          joint: 'visibility',
          message: 'Move back or improve lighting so more body joints are visible',
          severity: 'high'
        }],
        feedbackSummary: {
          overall: 'Not enough body joints visible',
          details: feedback
        },
        angleDetails,
        jointsAnalyzed: count
      };
    }

    // Calculate final scores
    const averageScore = count > 0 ? totalScore / count : 0;
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : averageScore;

    // Generate overall feedback message (BALANCED thresholds)
    let overallMessage = '';
    if (finalScore >= 80) {
      overallMessage = 'Excellent form! Perfect execution! 🌟';
    } else if (finalScore >= 70) {
      overallMessage = 'Great job! You\'re doing well 👍';
    } else if (finalScore >= 60) {
      overallMessage = 'Good effort! Keep adjusting 💪';
    } else if (finalScore >= 50) {
      overallMessage = 'Getting there! Focus on corrections 🎯';
    } else if (finalScore >= 30) {
      overallMessage = 'Keep practicing! Watch the tutorial again 📹';
    } else {
      overallMessage = 'Position yourself correctly and try again 🔄';
    }

    // Sort feedback by severity (high -> medium -> low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    feedback.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Limit feedback to top 3 most important issues
    const topFeedback = feedback.slice(0, 3);

    // Return feedback as array for frontend compatibility
    const feedbackArray = topFeedback.length > 0 ? topFeedback.map(f => ({
      ...f,
      message: f.message
    })) : [
      {
        joint: 'overall',
        message: overallMessage,
        severity: 'success'
      }
    ];

    return {
      score: Math.round(finalScore),
      averageScore: Math.round(averageScore),
      feedback: feedbackArray, // Array format for frontend
      feedbackSummary: {
        overall: overallMessage,
        details: topFeedback
      },
      angleDetails: angleDetails,
      jointsAnalyzed: count
    };
  }

  /**
   * Generate actionable feedback based on joint and angle difference
   */
  generateActionableFeedback(jointName, angleDiff, currentAngle, targetAngle) {
    const absAngleDiff = Math.abs(angleDiff);
    const needsMore = angleDiff < 0; // Current angle is less than target
    
    // Map joint names to actionable instructions
    const feedbackMap = {
      // Knee joints
      leftKnee: needsMore ? 'Straighten your left leg more' : 'Bend your left knee more',
      rightKnee: needsMore ? 'Straighten your right leg more' : 'Bend your right knee more',
      
      // Hip joints
      leftHip: needsMore ? 'Lift your left hip higher' : 'Lower your left hip',
      rightHip: needsMore ? 'Lift your right hip higher' : 'Lower your right hip',
      
      // Shoulder joints
      leftShoulder: needsMore ? 'Raise your left shoulder' : 'Lower your left shoulder and relax',
      rightShoulder: needsMore ? 'Raise your right shoulder' : 'Lower your right shoulder and relax',
      
      // Elbow joints
      leftElbow: needsMore ? 'Straighten your left arm' : 'Bend your left elbow more',
      rightElbow: needsMore ? 'Straighten your right arm' : 'Bend your right elbow more',
      
      // Spine
      spine: needsMore ? 'Straighten your back more' : 'Relax your spine slightly',
      
      // Standing/bent knee (for tree pose, etc.)
      standingKnee: needsMore ? 'Straighten your standing leg completely' : 'Slightly bend your standing knee',
      bentKnee: needsMore ? 'Straighten your bent leg more' : 'Bend your knee deeper'
    };
    
    // Get base instruction
    let instruction = feedbackMap[jointName] || `Adjust your ${jointName}`;
    
    // Add degree information for significant differences
    if (absAngleDiff > 20) {
      instruction += ` (${Math.round(absAngleDiff)}° off)`;
    }
    
    return instruction;
  }

  /**
   * Format joint name for display
   */
  formatJointName(key) {
    const names = {
      leftKnee: 'Left Knee',
      rightKnee: 'Right Knee',
      leftElbow: 'Left Elbow',
      rightElbow: 'Right Elbow',
      leftHip: 'Left Hip',
      rightHip: 'Right Hip',
      leftShoulder: 'Left Shoulder',
      rightShoulder: 'Right Shoulder',
      spine: 'Spine'
    };
    return names[key] || key;
  }

  /**
   * Reset angle history (call when switching poses)
   */
  resetAngleHistory() {
    this.angleHistory = {};
    this.angleConfidenceHistory = {};
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.pythonServer) {
      this.pythonServer.kill();
      this.pythonServer = null;
    }
    this.rejectAllPythonServerRequests(new Error('Pose detection service cleaned up'));
    this.initialized = false;
    this.initializationAttempted = false;
    this.initializationPromise = null;
    this.usingFallback = false;
    this.hasLoggedFallback = false;
    this.angleHistory = {};
    this.angleConfidenceHistory = {};
    this.lastAngleConfidences = {};
    console.log('Pose detection service cleaned up');
  }
}

// Export singleton instance
module.exports = new PoseDetectionService();

// Made with Bob - Enhanced Pose Detection Service
