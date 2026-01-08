const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { fuseEmotions } = require("../utils/fusion");

const { normalizeEmotion } = require("../utils/emotionMap");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// 🔁 reuse your deployed APIs
const SER_URL = "http://192.168.1.4:5000/api/emotion/voice";      // ser.js
const STER_URL = "http://192.168.1.4:5000/api/emotion/voicetext"; // ster.js

router.post("/multimodal", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded" });
    }

    const buildForm = () => {
      const fd = new FormData();
      fd.append("audio", fs.createReadStream(req.file.path));
      return fd;
    };

    // ---------- 1️⃣ SER ----------
    const serRes = await axios.post(SER_URL, buildForm(), {
      headers: buildForm().getHeaders(),
      timeout: 60000,
    });

    // ---------- 2️⃣ STT + Text Emotion ----------
    const sterRes = await axios.post(STER_URL, buildForm(), {
      headers: buildForm().getHeaders(),
      timeout: 60000,
    });

    fs.unlinkSync(req.file.path);

    const voice = {
        emotion: normalizeEmotion(serRes.data.emotion),
        confidence: serRes.data.confidence,
    };

    const textEmotion = {
        emotion: normalizeEmotion(sterRes.data.emotion),
        confidence: sterRes.data.confidence,
    };

    // ---------- 3️⃣ Fusion ----------
    const final = fuseEmotions({
      voice,
      text: textEmotion,
      face: null, // 🔥 future face model
    });

    res.json({
      voice,
      text_emotion: textEmotion,
      final,
    });
  } catch (err) {
    console.error("Multimodal error:", err.message);
    res.status(500).json({ error: "Multimodal fusion failed" });
  }
});

module.exports = router;
