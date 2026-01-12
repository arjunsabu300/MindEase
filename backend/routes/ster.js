const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const router = express.Router();
const upload = multer({ dest: "uploads/" });


const STT_ML_URL = "https://arjunsabu2003-mindeasestt.hf.space/predict/stt"

/**
 * Hugging Face Text Emotion API
 */
const ML_SERVER_URL =
    "https://adwaithjayan-mindease-text-emotion.hf.space/predict/text";




router.post("/voicetext", upload.single("audio"), async (req, res) => {
  let audioPath;

  try {
    /* ===================== VALIDATION ===================== */
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    audioPath = req.file.path;

    /* ===================== STT ===================== */
    const sttForm = new FormData();
    sttForm.append(
      "file",
      fs.createReadStream(audioPath),
      "voice.wav"
    );

    const sttResponse = await axios.post(
      STT_ML_URL,
      sttForm,
      {
        headers: sttForm.getHeaders(),
        timeout: 60000,
        validateStatus: () => true,
      }
    );

    // HF Space sleeping / HTML response
    if (typeof sttResponse.data === "string") {
      return res.status(502).json({
        error: "STT endpoint returned HTML (Space sleeping or wrong method)",
      });
    }

    const text = sttResponse.data?.text?.trim();
    if (!text) {
      return res.status(400).json({
        error: "STT produced empty text",
      });
    }

    console.log("🎤 Transcribed text:", text);

    /* ===================== TEXT EMOTION ===================== */
    const emotionResponse = await axios.post(
      ML_SERVER_URL,
      { text },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    if (typeof emotionResponse.data === "string") {
      return res.status(502).json({
        error: "Text emotion endpoint returned HTML",
      });
    }

    console.log("🧠 Text Emotion Result:", emotionResponse.data);

    /* ===================== FINAL RESPONSE ===================== */
    return res.json({
      text,
      emotion: emotionResponse.data.emotion,
      confidence: emotionResponse.data.confidence,
    });

  } catch (err) {
    console.error("❌ VoiceText Error:", err.message);
    return res.status(500).json({ error: "Voice-to-text processing failed" });

  } finally {
    /* ===================== SAFE CLEANUP ===================== */
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
});


module.exports = router;