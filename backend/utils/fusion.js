const WEIGHTS = {
  face: 0.45,
  text: 0.35,
  voice: 0.20,
};

const OVERRIDES = {
  face: 0.85,
  text: 0.80,
};

function fuseEmotions({ voice = null, text = null, face = null }) {
  // -------- Priority overrides --------
  if (face && face.confidence >= OVERRIDES.face) {
    return result(face.emotion, face.confidence, "face_override", ["face"]);
  }

  if (text && text.confidence >= OVERRIDES.text) {
    return result(text.emotion, text.confidence, "text_override", ["text"]);
  }

  // -------- Weighted fusion --------
  const scores = {};
  const used = [];

  const add = (type, res) => {
    scores[res.emotion] =
      (scores[res.emotion] || 0) + res.confidence * WEIGHTS[type];
    used.push(type);
  };

  if (voice) add("voice", voice);
  if (text) add("text", text);
  if (face) add("face", face);

  if (!Object.keys(scores).length) {
    return result("neutral", 0, "no_input", []);
  }

  const finalEmotion = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  return result(
    finalEmotion,
    Number(scores[finalEmotion].toFixed(3)),
    "weighted_fusion",
    used
  );
}

function result(emotion, confidence, strategy, modalities) {
  return {
    final_emotion: emotion,
    confidence,
    fusion_strategy: strategy,
    modalities_used: modalities,
  };
}

module.exports = { fuseEmotions };
