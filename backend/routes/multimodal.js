const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { fuseEmotions } = require("../utils/fusion");

const { normalizeEmotion } = require("../utils/emotionMap");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const uploadFields = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "image", maxCount: 1 }
]);


// 🔁 reuse your deployed APIs
const SER_URL = "http://192.168.1.5:5000/api/emotion/voice";      // ser.js
const STER_URL = "http://192.168.1.5:5000/api/emotion/voicetext"; // ster.js
const FACE_URL = "http://192.168.1.5:5000/api/emotion/face";

router.post("/multimodal", uploadFields, async (req, res) => {
  try {
        if (!req.files?.audio?.[0]) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    if (!req.files?.image?.[0]) {
      return res.status(400).json({ error: "Face image is required" });
    }


    const buildAudioForm = () => {
      const fd = new FormData();
      fd.append("audio", fs.createReadStream(req.files.audio[0].path));
      return fd;
    };

    const buildImageForm = () => {
      const fd = new FormData();
      fd.append("image", fs.createReadStream(req.files.image[0].path));
      return fd;
    };


    // ---------- 1️⃣ SER ----------

    const serForm = buildAudioForm();
    const serRes = await axios.post(SER_URL, serForm, {
      headers: serForm.getHeaders(),
      timeout: 60000,
    });

    // ---------- 2️⃣ STT + Text Emotion ----------
    const sterForm = buildAudioForm();
    const sterRes = await axios.post(STER_URL, sterForm, {
      headers: sterForm.getHeaders(),
      timeout: 60000,
    });


    const faceForm = buildImageForm();
    const FErRes = await axios.post(FACE_URL, faceForm, {
      headers: faceForm.getHeaders(),
      timeout: 60000,
    });

    if (!serRes.data?.emotion) {
      throw new Error("SER failed");
    }
    if (!sterRes.data?.emotion) {
      throw new Error("STT/Text failed");
    }
    if (!FErRes.data?.emotion && !FErRes.data?.label) {
      throw new Error("Face failed");
    }


    // fs.unlinkSync(req.files.audio[0].path);
    // fs.unlinkSync(req.files.image[0].path);


    const voice = {
        emotion: normalizeEmotion(serRes.data.emotion),
        confidence: serRes.data.confidence,
    };

    const textEmotion = {
        emotion: normalizeEmotion(sterRes.data.emotion),
        confidence: sterRes.data.confidence,
    };

    const faceEmotion = {
      emotion: normalizeEmotion(FErRes.data.label || FErRes.data.emotion),
      confidence: FErRes.data.score ?? FErRes.data.confidence ?? 0.85,
    };

        if (!voice?.emotion || !textEmotion?.emotion || !faceEmotion?.emotion) {
      throw new Error("Incomplete emotion inputs");
    }



    // ---------- 3️⃣ Fusion ----------
    const final = fuseEmotions({
      voice,
      text: textEmotion,
      face: faceEmotion, // 🔥 future face model
    });

    res.json({
      voice,
      text_emotion: textEmotion,
      face_emotion: faceEmotion,
      final,
    });
  } catch (err) {
    console.error("Multimodal error:", err.message);
    res.status(500).json({ error: "Multimodal fusion failed" });
  }

  finally {
  req.files?.audio?.[0]?.path && fs.unlinkSync(req.files.audio[0].path);
  req.files?.image?.[0]?.path && fs.unlinkSync(req.files.image[0].path);
}

});

module.exports = router;
