const fs = require("fs");

function buildDataset(sessions) {
  return sessions.map(s => [
    s.completionRatio,
    s.rating || 3,
    s.sessionDuration / 600, // normalize
  ]);
}

// Save for ML
fs.writeFileSync(
  "clustering_data.json",
  JSON.stringify(buildDataset(sessions))
);
