const YOGA_POSES = require("../utils/yogapose");

function recommendYoga(emotion, userProfile = {}) {
  let poses = YOGA_POSES[emotion] || [];

  // 🔧 PERSONALIZATION PARAMETERS
  const durationMultiplier =
    userProfile.avg_completion < 0.6 ? 0.7 :
    userProfile.avg_completion > 0.85 ? 1.1 : 1.0;

  return poses.map(p => ({
    ...p,
    duration: Math.round(p.duration * durationMultiplier),
  }));
}

module.exports = { recommendYoga };
