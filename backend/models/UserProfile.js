const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  avg_completion: { type: Number, default: 0.7 },
  avg_rating: { type: Number, default: 0 },

  totalSessions: { type: Number, default: 0 },

  emotionStats: {
    happy: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    angry: { type: Number, default: 0 },
    calm: { type: Number, default: 0 },
    fearful: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
  },
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
