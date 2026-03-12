const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const poseDetectionService = require('../services/posedetection');
const { poseTemplates } = require('../utils/poseTemplates');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `pose_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'));
    }
  }
});

/**
 * POST /api/pose/detect
 * Detect pose landmarks from uploaded image
 */
router.post('/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const imagePath = req.file.path;

    // Detect pose from image
    const result = await poseDetectionService.detectPoseFromImage(imagePath);

    // Clean up uploaded file after processing
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 5000);

    if (result.success) {
      res.json({
        success: true,
        landmarks: result.landmarks,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        message: result.landmarks ? 'Pose detected successfully' : 'No pose detected in image'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Pose detection failed'
      });
    }
  } catch (error) {
    console.error('Pose detection route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pose/validate
 * Validate detected pose against reference template
 */
router.post('/validate', async (req, res) => {
  try {
    const { landmarks, poseId } = req.body;

    if (!landmarks || !poseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing landmarks or poseId'
      });
    }

    // Get reference template
    const template = poseTemplates[poseId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Pose template not found for: ${poseId}`
      });
    }

    // Validate pose
    const validation = poseDetectionService.validatePose(landmarks, template);

    res.json({
      success: true,
      validation: {
        valid: validation.valid,
        score: validation.score,
        feedback: validation.feedback,
        angles: validation.angles
      },
      poseInfo: {
        id: poseId,
        name: template.name,
        instructions: template.instructions
      }
    });
  } catch (error) {
    console.error('Pose validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pose/templates
 * Get all available pose templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = Object.keys(poseTemplates).map(key => ({
      id: key,
      name: poseTemplates[key].name,
      keyPoints: poseTemplates[key].keyPoints,
      instructions: poseTemplates[key].instructions
    }));

    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pose/template/:poseId
 * Get specific pose template details
 */
router.get('/template/:poseId', (req, res) => {
  try {
    const { poseId } = req.params;
    const template = poseTemplates[poseId];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Pose template not found: ${poseId}`
      });
    }

    res.json({
      success: true,
      template: {
        id: poseId,
        name: template.name,
        keyAngles: template.keyAngles,
        keyPoints: template.keyPoints,
        instructions: template.instructions
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pose/analyze
 * Comprehensive pose analysis with image upload
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { poseId } = req.body;
    if (!poseId) {
      return res.status(400).json({
        success: false,
        error: 'Pose ID is required'
      });
    }

    const imagePath = req.file.path;

    // Get template
    const template = poseTemplates[poseId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Pose template not found: ${poseId}`
      });
    }

    // Detect pose
    const detection = await poseDetectionService.detectPoseFromImage(imagePath);

    // Clean up file
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 5000);

    if (!detection.success || !detection.landmarks) {
      return res.json({
        success: true,
        detected: false,
        message: 'No pose detected in image',
        template: {
          id: poseId,
          name: template.name,
          instructions: template.instructions
        }
      });
    }

    // Validate pose
    const validation = poseDetectionService.validatePose(detection.landmarks, template);

    res.json({
      success: true,
      detected: true,
      landmarks: detection.landmarks,
      validation: {
        valid: validation.valid,
        score: validation.score,
        feedback: validation.feedback,
        angles: validation.angles
      },
      template: {
        id: poseId,
        name: template.name,
        instructions: template.instructions
      }
    });
  } catch (error) {
    console.error('Pose analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

// Made with Bob
