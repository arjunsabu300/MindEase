const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * Hugging Face SER API
 */
const ML_SERVER_URL = "https://arjunsabu2003-sermodel.hf.space/predict/ser";

router.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const formData = new FormData();
    formData.append(
      "file", // IMPORTANT: FastAPI expects "file"
      fs.createReadStream(req.file.path),
      "voice.wav"
    );

    const mlResponse = await axios.post(
    ML_SERVER_URL,
    formData,
    {
        headers: {
        ...formData.getHeaders(),
        "Accept": "application/json",
        },
        timeout: 60000,
        validateStatus: () => true, // IMPORTANT for debugging
    }
    );
    // console.log("ML Response", mlResponse);

    if (typeof mlResponse.data === "string") {
    console.error("HTML returned instead of JSON");
    return res.status(502).json({
        error: "ML endpoint returned HTML (wrong URL or method)",
    });
    }
    fs.unlinkSync(req.file.path); // cleanup
    console.log("SER Result:", mlResponse.data);

    res.json(mlResponse.data);
  } catch (err) {
    console.error("SER error:", err.response?.data || err.message);
    res.status(500).json({ error: "SER processing failed" });
  }
});

module.exports = router;
