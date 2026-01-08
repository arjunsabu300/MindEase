const express = require("express");
const router = express.Router();
const { recommendYoga } = require("../services/yogarecommendation");
const Session = require("../models/Session");

router.post("/recommend", async (req, res) => {
  const { userId, emotion, modalities, userProfile } = req.body;
    if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required to start a yoga session",
    });
  }

  const yogaPlan = recommendYoga(emotion, userProfile);

  const session = await Session.create({
    userId,
    emotion,
    modalities,
    yogaPlan,
    totalDuration: yogaPlan.reduce((a, b) => a + b.duration, 0),
  });

  res.json({
    session,
    sessionId: session._id,
    yogaPlan,
  });
});

module.exports = router;
