const express = require("express");
const { recommendYoga } = require("../services/yogarecommendation");
const router = express.Router();

router.post("/recommend", async (req, res) => {
  const { userId, emotion, userProfile } = req.body;

  const yogaPlan = recommendYoga(emotion, userProfile);

  const session = {
    sessionId: Date.now().toString(),
    userId,
    emotion,
    yogaPlan,
    startedAt: new Date(),
  };

  // store session (DB / in-memory)
  res.json(session);
});

module.exports = router;
