const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const UserProfile = require("../models/UserProfile");

router.post("/feedback", async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      completed = false,
      completionRatio = 0,
      rating = 0,
    } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!sessionId || !userId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and userId are required",
      });
    }

    /* ---------------- SESSION ---------------- */
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Safety check (important)
    if (session.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "User does not own this session",
      });
    }

    session.completed = completed;
    session.completionRatio = completionRatio;
    session.rating = rating;
    session.endedAt = new Date();

    await session.save();

    /* ---------------- USER PROFILE ---------------- */
    let profile = await UserProfile.findOne({ userId });

    if (!profile) {
      profile = await UserProfile.create({
        userId,
        totalSessions: 0,
        avg_completion: 0,
        avg_rating: 0,
        emotionStats: {},
      });
    }

    const prevSessions = profile.totalSessions;

    profile.totalSessions += 1;

    // Running average (NO NaN bugs)
    profile.avg_completion =
      (profile.avg_completion * prevSessions + completionRatio) /
      profile.totalSessions;

    profile.avg_rating =
      (profile.avg_rating * prevSessions + rating) /
      profile.totalSessions;

    // Emotion stats (safe increment)
    const emotion = session.emotion;
    profile.emotionStats[emotion] =
      (profile.emotionStats[emotion] || 0) + 1;

    await profile.save();

    res.json({
      success: true,
      message: "Feedback recorded successfully",
    });
  } catch (err) {
    console.error("❌ Feedback error:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
