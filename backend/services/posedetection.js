const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Pose Detection Service using MediaPipe
 * This service processes images and detects body pose landmarks
 * Uses Python MediaPipe for accurate pose detection
 */

class PoseDetectionService {
  constructor() {
    this.initialized = false;
    this.initializationAttempted = false;
    this.usingFallback = false;
    this.hasLoggedFallback = false;
    this.scriptPath = path.join(__dirname, '../python/pose_detector.py');
    
    // Try to use virtual environment Python (cross-platform)
    const venvPythonMac = path.join(__dirname, '../python/venv/bin/python3');
    const venvPythonWin = path.join(__dirname, '../python/venv/Scripts/python.exe');
    
    if (fs.existsSync(venvPythonMac)) {
      // macOS/Linux virtual environment
      this.pythonPath = venvPythonMac;
      console.log('🐍 Using virtual environment Python (macOS/Linux)');
    } else if (fs.existsSync(venvPythonWin)) {
      // Windows virtual environment
      this.pythonPath = venvPythonWin;
      console.log('🐍 Using virtual environment Python (Windows)');
    } else {
      // Fallback to system Python
      this.pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      console.log('🐍 Using system Python (fallback)');
    }
  }

  /**
   * Initialize the pose detection model
   * Checks if Python and MediaPipe are available
   */
  async initialize() {
    if (this.initializationAttempted) {
      return;
    }

    this.initializationAttempted = true;

    try {
      // Check if Python script exists
      if (!fs.existsSync(this.scriptPath)) {
        console.warn('⚠️  Python MediaPipe script not found. Using fallback mode.');
        this.initialized = false;
        this.usingFallback = true;
        return;
      }

      // Test Python MediaPipe availability
      const testResult = await this.testPythonMediaPipe();
      
      if (testResult.success) {
        this.initialized = true;
        this.usingFallback = false;
        console.log('✅ MediaPipe pose detection initialized (Python)');
      } else {
        console.warn('⚠️  MediaPipe not available:', testResult.error);
        console.warn('⚠️  Using fallback pose detection until MediaPipe model/assets are available.');
        this.initialized = false;
        this.usingFallback = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize pose detection:', error);
      this.initialized = false;
    }
  }

  /**
   * Test if Python MediaPipe is working
   */
  async testPythonMediaPipe() {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, [this.scriptPath, '--healthcheck']);
      
      let output = '';
      let errorOutput = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        try {
          const result = JSON.parse(output);
          if (result.success && result.ready) {
            resolve({ success: true });
            return;
          }

          resolve({
            success: false,
            error: result.error || 'MediaPipe detector is not ready',
          });
        } catch (error) {
          resolve({
            success: false,
            error: errorOutput || output || `Healthcheck failed with exit code ${code}`,
          });
        }
      });

      process.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  /**
   * Detect pose from image file using Python MediaPipe
   * @param {string} imagePath - Path to the image file
   * @returns {Object} Pose landmarks and metadata
   */
  async detectPoseFromImage(imagePath) {
    if (!this.initializationAttempted) {
      await this.initialize();
    }

    // If MediaPipe not available, use fallback
    if (!this.initialized) {
      return this.fallbackDetection(imagePath);
    }

    try {
      // Call Python MediaPipe script
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
      this.usingFallback = true;
      this.usingFallback = true;
      // Fallback to mock detection
      return this.fallbackDetection(imagePath);
    }
  }

  /**
   * Call Python MediaPipe script
   */
  async callPythonMediaPipe(imagePath) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.scriptPath, imagePath]);
      
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (error) {
            reject(new Error('Failed to parse MediaPipe output'));
          }
        } else {
          reject(new Error(`MediaPipe process failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('MediaPipe process timeout'));
      }, 10000);
    });
  }

  /**
   * Fallback detection when MediaPipe is not available
   * Generates realistic mock landmarks for testing
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
   * Returns 33 landmarks matching MediaPipe Pose format
   */
  generateMockLandmarks() {
    // Generate realistic pose landmarks with some variation
    const variation = () => (Math.random() - 0.5) * 0.05; // ±2.5% variation
    
    const landmarks = [
      // 0-10: Face landmarks (nose, eyes, ears, mouth)
      { x: 0.5 + variation(), y: 0.15 + variation(), z: 0, visibility: 0.99 }, // 0: nose
      { x: 0.48 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 1: left eye inner
      { x: 0.47 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 2: left eye
      { x: 0.46 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 3: left eye outer
      { x: 0.52 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 4: right eye inner
      { x: 0.53 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 5: right eye
      { x: 0.54 + variation(), y: 0.14 + variation(), z: 0, visibility: 0.99 }, // 6: right eye outer
      { x: 0.44 + variation(), y: 0.16 + variation(), z: 0, visibility: 0.99 }, // 7: left ear
      { x: 0.56 + variation(), y: 0.16 + variation(), z: 0, visibility: 0.99 }, // 8: right ear
      { x: 0.48 + variation(), y: 0.18 + variation(), z: 0, visibility: 0.99 }, // 9: mouth left
      { x: 0.52 + variation(), y: 0.18 + variation(), z: 0, visibility: 0.99 }, // 10: mouth right
      
      // 11-12: Shoulders
      { x: 0.42 + variation(), y: 0.30 + variation(), z: 0, visibility: 0.99 }, // 11: left shoulder
      { x: 0.58 + variation(), y: 0.30 + variation(), z: 0, visibility: 0.99 }, // 12: right shoulder
      
      // 13-16: Arms
      { x: 0.38 + variation(), y: 0.45 + variation(), z: 0, visibility: 0.99 }, // 13: left elbow
      { x: 0.62 + variation(), y: 0.45 + variation(), z: 0, visibility: 0.99 }, // 14: right elbow
      { x: 0.35 + variation(), y: 0.60 + variation(), z: 0, visibility: 0.99 }, // 15: left wrist
      { x: 0.65 + variation(), y: 0.60 + variation(), z: 0, visibility: 0.99 }, // 16: right wrist
      
      // 17-22: Hands
      { x: 0.34 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 }, // 17: left pinky
      { x: 0.33 + variation(), y: 0.61 + variation(), z: 0, visibility: 0.95 }, // 18: left index
      { x: 0.32 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 }, // 19: left thumb
      { x: 0.66 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 }, // 20: right pinky
      { x: 0.67 + variation(), y: 0.61 + variation(), z: 0, visibility: 0.95 }, // 21: right index
      { x: 0.68 + variation(), y: 0.62 + variation(), z: 0, visibility: 0.95 }, // 22: right thumb
      
      // 23-24: Hips
      { x: 0.45 + variation(), y: 0.65 + variation(), z: 0, visibility: 0.99 }, // 23: left hip
      { x: 0.55 + variation(), y: 0.65 + variation(), z: 0, visibility: 0.99 }, // 24: right hip
      
      // 25-28: Legs
      { x: 0.44 + variation(), y: 0.80 + variation(), z: 0, visibility: 0.99 }, // 25: left knee
      { x: 0.56 + variation(), y: 0.80 + variation(), z: 0, visibility: 0.99 }, // 26: right knee
      { x: 0.43 + variation(), y: 0.95 + variation(), z: 0, visibility: 0.99 }, // 27: left ankle
      { x: 0.57 + variation(), y: 0.95 + variation(), z: 0, visibility: 0.99 }, // 28: right ankle
      
      // 29-32: Feet
      { x: 0.42 + variation(), y: 0.98 + variation(), z: 0, visibility: 0.95 }, // 29: left heel
      { x: 0.58 + variation(), y: 0.98 + variation(), z: 0, visibility: 0.95 }, // 30: right heel
      { x: 0.41 + variation(), y: 0.99 + variation(), z: 0, visibility: 0.95 }, // 31: left foot index
      { x: 0.59 + variation(), y: 0.99 + variation(), z: 0, visibility: 0.95 }, // 32: right foot index
    ];
    
    return landmarks;
  }

  /**
   * Validate pose against reference template
   * @param {Array} landmarks - Detected pose landmarks
   * @param {Object} referenceTemplate - Reference pose template
   * @returns {Object} Validation results with score and feedback
   */
  validatePose(landmarks, referenceTemplate) {
    if (!landmarks || !referenceTemplate) {
      return {
        valid: false,
        score: 0,
        feedback: 'Unable to detect pose'
      };
    }

    try {
      // Calculate angles from landmarks
      const userAngles = this.extractAngles(landmarks);
      
      // Compare with reference
      const comparison = this.compareAngles(userAngles, referenceTemplate.keyAngles);
      
      return {
        valid: comparison.score >= 70,
        score: comparison.score,
        feedback: comparison.feedback,
        angles: userAngles
      };
    } catch (error) {
      console.error('Pose validation error:', error);
      return {
        valid: false,
        score: 0,
        feedback: 'Validation error occurred'
      };
    }
  }

  /**
   * Extract angles from landmarks
   */
  extractAngles(landmarks) {
    const angles = {};

    try {
      // Left knee angle
      angles.leftKnee = this.calculateAngle(
        landmarks[23], // left hip
        landmarks[25], // left knee
        landmarks[27]  // left ankle
      );

      // Right knee angle
      angles.rightKnee = this.calculateAngle(
        landmarks[24], // right hip
        landmarks[26], // right knee
        landmarks[28]  // right ankle
      );

      // Left elbow angle
      angles.leftElbow = this.calculateAngle(
        landmarks[11], // left shoulder
        landmarks[13], // left elbow
        landmarks[15]  // left wrist
      );

      // Right elbow angle
      angles.rightElbow = this.calculateAngle(
        landmarks[12], // right shoulder
        landmarks[14], // right elbow
        landmarks[16]  // right wrist
      );

      // Hip angles
      angles.leftHip = this.calculateAngle(
        landmarks[11], // left shoulder
        landmarks[23], // left hip
        landmarks[25]  // left knee
      );

      angles.rightHip = this.calculateAngle(
        landmarks[12], // right shoulder
        landmarks[24], // right hip
        landmarks[26]  // right knee
      );

      // Shoulder angles
      angles.leftShoulder = this.calculateAngle(
        landmarks[23], // left hip
        landmarks[11], // left shoulder
        landmarks[13]  // left elbow
      );

      angles.rightShoulder = this.calculateAngle(
        landmarks[24], // right hip
        landmarks[12], // right shoulder
        landmarks[14]  // right elbow
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
   * Compare user angles with reference angles
   */
  compareAngles(userAngles, referenceAngles) {
    let totalScore = 0;
    let count = 0;
    const feedback = [];

    Object.keys(referenceAngles).forEach(key => {
      if (userAngles[key] !== undefined) {
        const reference = referenceAngles[key];
        const diff = Math.abs(userAngles[key] - reference.angle);
        const tolerance = reference.tolerance || 15;
        
        const score = Math.max(0, 100 - (diff / tolerance) * 100);
        totalScore += score;
        count++;

        if (diff > tolerance) {
          const adjustment = userAngles[key] > reference.angle ? 'decrease' : 'increase';
          feedback.push({
            joint: key,
            message: `${this.formatJointName(key)}: ${adjustment} angle by ${Math.round(diff)}°`,
            severity: diff > tolerance * 1.5 ? 'high' : 'medium'
          });
        }
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;

    return {
      score: averageScore,
      feedback: feedback.length > 0 ? feedback : [{ message: 'Good form!', severity: 'low' }]
    };
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
   * Clean up resources
   */
  async cleanup() {
    this.initialized = false;
    this.initializationAttempted = false;
    this.usingFallback = false;
    this.hasLoggedFallback = false;
    console.log('Pose detection service cleaned up');
  }
}

// Export singleton instance
module.exports = new PoseDetectionService();

// Made with Bob
