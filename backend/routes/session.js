const express = require("express");
const router = express.Router();

const sessions = []; // replace with DB later

router.post("/feedback", (req, res) => {
  const {
    sessionId,
    completed,
    completionRatio,
    rating,
  } = req.body;

  sessions.push({
    sessionId,
    completed,
    completionRatio,
    rating,
    timestamp: new Date(),
  });

  res.json({ status: "feedback recorded" });
});

module.exports = router;
