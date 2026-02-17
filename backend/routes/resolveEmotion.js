const express = require("express");

const router = express.Router();

const { questionStore } = require("../utils/llmQuestions");

router.post("/resolve", async (req, res) => {

  try {

    const { questionSessionId, answers } = req.body;

    if (!questionSessionId || !answers) {

      return res.status(400).json({
        error: "Missing questionSessionId or answers"
      });

    }

    const questions = questionStore.get(questionSessionId);

    if (!questions) {

      return res.status(404).json({
        error: "Session not found or expired"
      });

    }

    // emotion score tracker
    const emotionScores = {};

    for (const question of questions) {

      const selectedOptionId = answers[question.id];

      const option = question.options.find(
        opt => opt.id === selectedOptionId
      );

      if (!option) continue;

      const emotion = option.emotion;
      const score = option.score || 1;

      emotionScores[emotion] =
        (emotionScores[emotion] || 0) + score;

    }

    // determine final emotion
    let finalEmotion = null;
    let maxScore = -1;

    for (const emotion in emotionScores) {

      if (emotionScores[emotion] > maxScore) {

        finalEmotion = emotion;
        maxScore = emotionScores[emotion];

      }

    }

    if (!finalEmotion) {

      finalEmotion = "neutral";
      maxScore = 0;

    }

    // optional: delete session after use
    questionStore.delete(questionSessionId);

    return res.json({

      emotion: finalEmotion,

      confidence: Math.min(0.5 + maxScore * 0.1, 0.99),

      scores: emotionScores,

      source: "llm_questionnaire"

    });

  } catch (err) {

    console.error("Resolve ERROR:", err);

    res.status(500).json({
      error: err.message
    });

  }

});

module.exports = router;
