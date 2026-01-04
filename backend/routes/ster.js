const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const router = express.Router();
const upload = multer({ dest: "uploads/" });


const STT_ML_URL = "https://arjunsabu2003-mindeasestt.hf.space/predict/stt"

router.post("/voicetext", upload.single("audio"), async(req, res) => {
    try{
        if(!req.file){
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

        const transcript = sttResponse.data.text;
        if (!transcript || transcript.trim().length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
            error: "Empty transcription",
        });
        }
        console.log("Transcription:", transcript);
        fs.unlinkSync(req.file.path); // cleanup
        return res.json({ transcript });

    } catch (error) {
        console.error("Error processing audio:", error);
        res.status(500).json({ error: "Failed to process audio" });
    }
});

module.exports = router;