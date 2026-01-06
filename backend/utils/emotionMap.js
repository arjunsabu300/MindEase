const EMOTION_MAP = {
  // --- HAPPY ---
  happiness: "happy",
  fun: "happy",
  love: "happy",
  enthusiasm: "happy",
  happy: "happy",

  // --- SAD ---
  sadness: "sad",
  empty: "sad",
  boredom: "sad",
  sad: "sad",

  // --- ANGRY ---
  anger: "angry",
  hate: "angry",
  disgust: "angry",
  angry: "angry",

  // --- FEAR / STRESS ---
  fearful: "fearful",
  fear: "fearful",
  worry: "stressed",
  anxious: "stressed",
  stressed: "stressed",

  // --- CALM ---
  calm: "calm",
  relief: "calm",
  peaceful: "calm",

  // --- SURPRISE ---
  surprise: "surprised",
  surprised: "surprised",

  // --- NEUTRAL ---
  neutral: "neutral",
};

function normalizeEmotion(label) {
  if (!label) return "neutral";
  const key = label.toLowerCase().trim();
  return EMOTION_MAP[key] || "neutral";
}

module.exports = { normalizeEmotion };
