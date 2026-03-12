const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Pose Detection Service using MediaPipe
 * This service processes images and detects body pose landmarks
 */

class PoseDetectionService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the pose detection model
   * Note: For production, you would initialize MediaPipe Pose here
   * Since MediaPipe is primarily for browser/Python, we'll use a hybrid approach
   */
  async initialize() {
    try {
      // In production, you might use:
      // - TensorFlow.js with PoseNet/MoveNet
      // - Python subprocess with MediaPipe
      // - Cloud API (Google Cloud Vision, etc.)
      
      this.initialized = true;
      console.log('✅ Pose detection service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize pose detection:', error);
      throw error;
    }
  }

  /**
   * Detect pose from image file
   * @param {string} imagePath - Path to the image file
   * @returns {Object} Pose landmarks and metadata
   */
  async detectPoseFromImage(imagePath) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Load and process image
      const image = await loadImage(imagePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      // In production, process with actual pose detection model
      // For now, we'll return a structured response
      
      const landmarks = await this.processImage(canvas);
      
      return {
        success: true,
        landmarks: landmarks,
        imageWidth: image.width,
        imageHeight: image.height,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Pose detection error:', error);
      return {
        success: false,
        error: error.message,
        landmarks: null
      };
    }
  }

  /**
   * Process image and extract pose landmarks
   * This is a placeholder - in production, use actual ML model
   */
  async processImage(canvas) {
    // In production, this would:
    // 1. Run the image through MediaPipe Pose or TensorFlow model
    // 2. Extract 33 body landmarks
    // 3. Return normalized coordinates (0-1 range)
    
    // For development, return null to indicate no detection
    // The frontend will handle this gracefully
    return null;
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
    console.log('Pose detection service cleaned up');
  }
}

// Export singleton instance
module.exports = new PoseDetectionService();

// Made with Bob
