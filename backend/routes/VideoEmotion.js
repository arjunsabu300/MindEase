const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const axios = require("axios");
const FormData = require("form-data");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const MULTIMODAL_URL = "https://mindease-euf7.onrender.com/api/emotion/multimodal";

const FRAME_TIMES = ["0.5", "1", "1.5", "2.2", "3"];

// ------------------- VIDEO ROUTE -----------------------

router.post("/video", upload.single("video"), async (req, res) => {
  let videoPath, audioPath;
  const frameFiles = [];

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    videoPath = req.file.path;
    
    // Validate video file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({ error: "Uploaded file not found" });
    }

    // ---------- Extract audio ----------
    audioPath = path.join(uploadsDir, `audio_${Date.now()}.wav`);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .on('end', () => {
          console.log('Audio extraction finished');
          resolve();
        })
        .on('error', (err) => {
          console.error('Audio extraction error:', err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });

    // ---------- Extract frames ----------
    console.log("Extracting frames...");
    
    for (let i = 0; i < FRAME_TIMES.length; i++) {
      const framePath = path.join(uploadsDir, `frame_${Date.now()}_${i}.jpg`);
      frameFiles.push(framePath);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [FRAME_TIMES[i]],
            filename: path.basename(framePath),
            folder: path.dirname(framePath),
            size: '512x512'
          })
          .on('end', () => {
            console.log(`Frame extracted at ${FRAME_TIMES[i]}s`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error extracting frame at ${FRAME_TIMES[i]}s:`, err);
            // Don't reject, just continue with other frames
            resolve();
          });
      });
    }

    // Filter out frames that don't exist or are empty
    const validFrames = frameFiles.filter(file => 
      fs.existsSync(file) && fs.statSync(file).size > 1000 // At least 1KB
    );

    if (validFrames.length === 0) {
      return res.status(400).json({ error: "Could not extract valid frames from video" });
    }

    // ---------- Pick best frame by FILE SIZE ----------
    let bestFrame = validFrames
      .map((file) => ({
        path: file,
        size: fs.statSync(file).size,
      }))
      .sort((a, b) => b.size - a.size)[0].path;

    console.log(`Best frame selected: ${bestFrame}`);

    // ---------- Send audio + frame to multimodal endpoint ----------
    console.log("Sending to multimodal endpoint...");
    
    const multimodalForm = new FormData();
    
    // Add audio file
    multimodalForm.append("audio", fs.createReadStream(audioPath), {
      filename: "audio.wav",
      contentType: "audio/wav"
    });
    
    // Add image file (best frame)
    multimodalForm.append("image", fs.createReadStream(bestFrame), {
      filename: "frame.jpg",
      contentType: "image/jpeg"
    });

    // Send to multimodal endpoint with increased timeout
    const multimodalRes = await axios.post(MULTIMODAL_URL, multimodalForm, {
      headers: {
        ...multimodalForm.getHeaders(),
        "Content-Type": `multipart/form-data; boundary=${multimodalForm._boundary}`
      },
      timeout: 180000, // 3 minutes for video processing
    });



    const fusion = multimodalRes.data.final;

    let result = {
      face: multimodalRes.data.face,
      voice: multimodalRes.data.voice,
      text: multimodalRes.data.text_emotion,
      fusion: fusion
    };

    // Only set finalEmotion if NO conflict
    if (fusion?.source !== "llm_required") {

      result.finalEmotion = fusion?.final_emotion;
      result.confidence = fusion?.confidence;

    } else {

      result.status = "conflict";
      result.candidates = fusion?.candidates;

    }


    console.log("Video processing completed successfully");

    return res.json(result);

  } catch (err) {
    console.error("VIDEO PROCESSING ERROR:", err.message);
    
    return res.status(500).json({
      error: "Video processing failed",
      details: err.message,
    });
  } finally {
    // ---------- Cleanup ----------
    try {
      // Clean up video file
      if (videoPath && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      // Clean up audio file
      if (audioPath && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      
      // Clean up frame files
      frameFiles.forEach((file) => {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr.message);
    }
  }
});

module.exports = router;