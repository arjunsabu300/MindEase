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

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", sessionSchema);
