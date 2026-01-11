const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const FER_URL = "https://aceblade33-face-emotion-api-docker.hf.space/predict";

router.post("/face", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(FER_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    fs.unlinkSync(req.file.path);

    if (response.data?.emotion) {
      return res.json({
        label: response.data.emotion,
        score: response.data.confidence,
      });
    } else {
      return res.status(500).json({ error: "Invalid response", raw: response.data });
    }
  } catch (err) {
    console.error("FER ERROR:", err.response?.data || err.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: "Face analysis failed" });
  }
});

module.exports = router;
