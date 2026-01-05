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
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file uploaded" });
        }
        const audioFormData = () => {
            const fd = new FormData();
            fd.append(
                "file",
                fs.createReadStream(req.file.path),
                "voice.wav"
            );
            return fd;
        };
        const sttResponse = await axios.post(
            STT_ML_URL,
            audioFormData(),
            {
                headers: { ...audioFormData().getHeaders() },
                timeout: 60000,
                validateStatus: () => true,
            }
        );

        if (typeof sttResponse.data === "string" && sttResponse.data.startsWith("<!DOCTYPE html>")) {
            fs.unlinkSync(req.file.path);
            return res.status(502).json({
                error: "STT ML returned HTML",
            });
        }

        const text = sttResponse.data.text;
        if (!text || text.trim().length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: "Empty textion",
            });
        }
        console.log("text:", text);
        fs.unlinkSync(req.file.path); // cleanup

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Text is required" });
        }

        const mlResponse = await axios.post(
            ML_SERVER_URL,
            { text },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout: 30000,
                validateStatus: () => true, // IMPORTANT for debugging
            }
        );

        console.log("ML Response:", mlResponse.data);

        // If HF Space returns HTML (Space sleeping or wrong method)
        if (typeof mlResponse.data === "string") {
            console.error("HTML returned instead of JSON");
            return res.status(502).json({
                error: "ML endpoint returned HTML (Space sleeping or wrong method)",
            });
        }

        res.json(mlResponse.data);


    } catch (error) {
        console.error("Error processing audio:", error);
        res.status(500).json({ error: "Failed to process audio" });
    }
});

module.exports = router;