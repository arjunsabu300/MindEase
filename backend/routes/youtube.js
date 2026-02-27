const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/youtube", async (req, res) => {
  const pose = req.query.pose;

  if (!pose) {
    return res.status(400).json({ message: "Pose is required" });
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: `${pose} yoga pose tutorial`,
          type: "video",
          maxResults: 1,
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const items = response.data.items;

    if (!items || items.length === 0) {
      return res.status(404).json({ message: "No video found" });
    }

    const video = items[0];

    res.json({
      videoId: video.id.videoId,
      title: video.snippet.title,
    });

  } catch (error) {
    console.error("YouTube API error:", error.message);
    res.status(500).json({ message: "YouTube API failed" });
  }
});

module.exports = router;