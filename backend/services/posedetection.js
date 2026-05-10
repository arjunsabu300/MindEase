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
    
    // Temporal smoothing buffer for reducing jitter
    this.angleHistory = {};
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
          if (errorOutput) console.log('   Error output:', errorOutput);

          if (code !== 0) {
            resolve({
              success: false,
              error: errorOutput || output || `Healthcheck failed with exit code ${code}`,
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
              error: errorOutput || output || `Healthcheck failed with exit code ${code}`,
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
        env: {
          ...process.env,
          TF_CPP_MIN_LOG_LEVEL: process.env.TF_CPP_MIN_LOG_LEVEL || '2',
          GLOG_minloglevel: process.env.GLOG_minloglevel || '2',
        },
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
      
      if (result.success && result.detected) {
        this.usingFallback = false;
        return {
          success: true,
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
          landmarks: null,
          message: result.message || 'No pose detected',
          method: 'mediapipe'
        };
      }
    } catch (error) {
      console.error('MediaPipe detection error:', error);
      this.initialized = false;
      this.usingFallback = true;
      return this.fallbackDetection(imagePath);
    }
  }

  /**
   * Call Python MediaPipe script
   */
  async callPythonMediaPipe(imagePath) {
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
      const userAngles = this.extractAngles(landmarks);
      
      // Check if angles were successfully extracted
      if (Object.keys(userAngles).length === 0) {
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
      const smoothedAngles = this.applySmoothingToAngles(userAngles);
      
      // Pass pose name for critical validation
      const poseName = referenceTemplate.name ?
        Object.keys(require('../utils/poseTemplates').poseTemplates).find(
          key => require('../utils/poseTemplates').poseTemplates[key].name === referenceTemplate.name
        ) : '';
      
      const comparison = this.compareAnglesWithRanges(smoothedAngles, referenceTemplate.keyAngles, poseName);
      
      return {
        valid: comparison.score >= 50, // More liberal threshold (was 60)
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
    });
    
    return smoothedAngles;
  }

  /**
   * Extract angles from landmarks
   */
  extractAngles(landmarks) {
    const angles = {};

    try {
      angles.leftKnee = this.calculateAngle(
        landmarks[23], landmarks[25], landmarks[27]
      );

      angles.rightKnee = this.calculateAngle(
        landmarks[24], landmarks[26], landmarks[28]
      );

      angles.leftElbow = this.calculateAngle(
        landmarks[11], landmarks[13], landmarks[15]
      );

      angles.rightElbow = this.calculateAngle(
        landmarks[12], landmarks[14], landmarks[16]
      );

      angles.leftHip = this.calculateAngle(
        landmarks[11], landmarks[23], landmarks[25]
      );

      angles.rightHip = this.calculateAngle(
        landmarks[12], landmarks[24], landmarks[26]
      );

      angles.leftShoulder = this.calculateAngle(
        landmarks[23], landmarks[11], landmarks[13]
      );

      angles.rightShoulder = this.calculateAngle(
        landmarks[24], landmarks[12], landmarks[14]
      );

      // Spine angle
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
    console.log(`🔍 Pose Check: ${totalCriticalJoints} critical joints, ${criticalMismatches} mismatches (${Math.round(criticalMismatches/totalCriticalJoints*100)}%)`);
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
          // Perfect range: 85-100 points (within 30% of tolerance)
          angleScore = 85 + (15 * (1 - (diff / (tolerance * 0.3))));
          status = 'perfect';
        } else if (userAngle >= minGood && userAngle <= maxGood) {
          // Good range: 70-85 points (within 60% of tolerance)
          const goodDiff = Math.min(
            Math.abs(userAngle - minGood),
            Math.abs(userAngle - maxGood)
          );
          angleScore = 70 + (15 * (1 - (goodDiff / (tolerance * 0.4))));
          status = 'good';
        } else if (userAngle >= minAcceptable && userAngle <= maxAcceptable) {
          // Acceptable range: 55-70 points (within full tolerance)
          const acceptableDiff = Math.min(
            Math.abs(userAngle - minAcceptable),
            Math.abs(userAngle - maxAcceptable)
          );
          angleScore = 55 + (15 * (1 - (acceptableDiff / tolerance)));
          status = 'acceptable';
        } else {
          // Outside acceptable range: 0-55 points (gradual penalty)
          const excessDiff = diff - tolerance;
          angleScore = Math.max(0, 55 - (excessDiff * 1.5));
          status = 'needs_adjustment';
        }

        // Apply weight to score
        weightedScore += angleScore * weight;
        totalWeight += weight;
        totalScore += angleScore;
        count++;

        // Store angle details
        angleDetails[key] = {
          current: Math.round(userAngle),
          target: targetAngle,
          diff: Math.round(diff),
          score: Math.round(angleScore),
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
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.initialized = false;
    this.initializationAttempted = false;
    this.initializationPromise = null;
    this.usingFallback = false;
    this.hasLoggedFallback = false;
    this.angleHistory = {};
    console.log('Pose detection service cleaned up');
  }
}

// Export singleton instance
module.exports = new PoseDetectionService();

// Made with Bob - Enhanced Pose Detection Service
