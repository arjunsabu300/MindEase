const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { fuseEmotions } = require("../utils/fusion");
const { normalizeEmotion } = require("../utils/emotionMap");
const { generateQuestions } = require("../utils/llmQuestions");


const router = express.Router();

// Accept audio + image together
const upload = multer({ dest: "uploads/" }).fields([
  { name: "audio", maxCount: 1 },
  { name: "image", maxCount: 1 }
]);

// MODEL URLS
const SER_URL  = "https://mindease-euf7.onrender.com/api/emotion/voice";
const STT_URL  = "https://mindease-euf7.onrender.com/api/emotion/voicetext";
const FER_URL  = "https://aceblade33-face-emotion-api-docker.hf.space/predict";

router.post("/multimodal", upload, async (req, res) => {
  try {
    const audioFile = req.files?.audio?.[0];
    const imageFile = req.files?.image?.[0];

    if (!audioFile && !imageFile) {
      return res.status(400).json({ error: "Upload audio, image, or both" });
    }

    /* ---------------------------------------------------
       1️⃣ FACE EMOTION (if image was sent)
    --------------------------------------------------- */
    let face = null;

    if (imageFile) {
      try {
        const fd = new FormData();
        fd.append("file", fs.createReadStream(imageFile.path), {
          filename: imageFile.originalname,
          contentType: imageFile.mimetype,
        });

        const faceRes = await axios.post(FER_URL, fd, {
          headers: fd.getHeaders(),
          timeout: 30000
        });

        face = {
          emotion: faceRes.data.emotion,
          confidence: faceRes.data.confidence
        };
        console.log("FER:",face)

      } catch (err) {
        console.error("FER ERROR:", err.message);
      }

      fs.unlinkSync(imageFile.path);
    }

    /* ---------------------------------------------------
       2️⃣ SER + STT (if audio was sent)
    --------------------------------------------------- */
    let voice = null;
    let textEmotion = null;

    if (audioFile) {
      // SER - Create fresh form data
      const serForm = new FormData();
      serForm.append("audio", fs.createReadStream(audioFile.path));
      
      const serRes = await axios.post(SER_URL, serForm, {
        headers: serForm.getHeaders(),
        timeout: 60000
      });

      // STT + Text Emotion - Create fresh form data with new stream
      const sttForm = new FormData();
      sttForm.append("audio", fs.createReadStream(audioFile.path));
      
      const sttRes = await axios.post(STT_URL, sttForm, {
        headers: sttForm.getHeaders(),
        timeout: 60000
      });

      fs.unlinkSync(audioFile.path);

      voice = {
        emotion: normalizeEmotion(serRes.data.emotion),
        confidence: serRes.data.confidence
      };

      textEmotion = {
        emotion: normalizeEmotion(sttRes.data.emotion),
        confidence: sttRes.data.confidence
      };
    }

    /* ---------------------------------------------------
       3️⃣ FUSION (face + voice + text)
    --------------------------------------------------- */

    // const final = fuseEmotions({
    //   voice,
    //   text: textEmotion,
    //   face
    // });

     /* ---------------------------------------------------
       3️⃣ LLM + FUSION (face + voice + text) (If no difference of outputs calls fusion else llm)
    --------------------------------------------------- */
    /* ---------------------------------------------------
   3️⃣ CHECK CONFLICT → CALL LLM IF NEEDED
--------------------------------------------------- */

  let final = null;

  // Collect available emotions
  const emotions = [];

  if (face?.emotion) emotions.push(face.emotion);
  if (voice?.emotion) emotions.push(voice.emotion);
  if (textEmotion?.emotion) emotions.push(textEmotion.emotion);

  // Get unique emotions
  const uniqueEmotions = [...new Set(emotions)];

  const allDifferent = uniqueEmotions.length === emotions.length && emotions.length > 1;

  if (allDifferent) {

    console.log("Conflict detected. Calling LLM...");

    const llmResult = await generateQuestions(uniqueEmotions);

    final = {
      source: "llm_required",
      questionSessionId: llmResult.questionSessionId,
      questions: llmResult.questions,
      candidates: uniqueEmotions
};
  } else {

    console.log("No conflict. Using fusion.");

    final = fuseEmotions({
      voice,
      text: textEmotion,
      face
    });

  }``



    /* ---------------------------------------------------
       4️⃣ RESPONSE TO FRONTEND
    --------------------------------------------------- */

    return res.json({
      face,
      voice,
      text_emotion: textEmotion,
      final
    });

  } catch (err) {
    console.error("Multimodal ERROR:", err.message);
    return res.status(500).json({ error: "Multimodal fusion failed", details: err.message });
  }
});

module.exports = router;
