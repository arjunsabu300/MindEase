const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  emotion: { type: String, required: true },

  modalities: {
    voice: {
      emotion: String,
      confidence: Number,
    },
    text: {
      emotion: String,
      confidence: Number,
    },
    face: {
      emotion: String,
      confidence: Number,
    },
  },

  yogaPlan: [
    {
      id: String,
      duration: Number,
      intensity: String,
    },
  ],

  completed: Boolean,
  completionRatio: Number,
  rating: Number,

  totalDuration: Number,

  // Pose correction tracking
  poseHistory: [
    {
      poseId: String,
      timestamp: { type: Date, default: Date.now },
      score: Number,
      feedback: [
        {
          joint: String,
          message: String,
          severity: String
        }
      ],
      angles: {
        leftKnee: Number,
        rightKnee: Number,
        leftElbow: Number,
        rightElbow: Number,
        leftHip: Number,
        rightHip: Number,
        leftShoulder: Number,
        rightShoulder: Number,
        spine: Number
      },
      duration: Number // Time held in seconds
    }
  ],

  // Overall pose performance
  averagePoseScore: Number,
  totalPosesCompleted: Number,
  bestPoseScore: Number,

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", sessionSchema);
