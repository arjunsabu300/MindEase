const Session = require("../models/Session");
const UserProfile = require("../models/UserProfile");

exports.updatePoseScore = async (req, res) => {
  try {
    const { sessionId, poseScore, poseId, feedback, angles, duration } = req.body;

    const completionRatio = poseScore / 100;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Add pose history entry
    const poseEntry = {
      poseId: poseId || 'unknown',
      timestamp: new Date(),
      score: poseScore,
      feedback: feedback || [],
      angles: angles || {},
      duration: duration || 0
    };

    session.poseHistory.push(poseEntry);

    // Update overall pose performance
    const allScores = session.poseHistory.map(p => p.score);
    session.averagePoseScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    session.totalPosesCompleted = session.poseHistory.length;
    session.bestPoseScore = Math.max(...allScores);

    // Update completion status
    session.completionRatio = completionRatio;
    session.completed = completionRatio > 0.7;

    await session.save();

    // Update user profile
    await UserProfile.findOneAndUpdate(
      { userId: session.userId },
      {
        $inc: { totalSessions: 1 },
        $set: { avg_completion: completionRatio },
      }
    );

    res.json({
      success: true,
      averageScore: session.averagePoseScore,
      totalPoses: session.totalPosesCompleted,
      bestScore: session.bestPoseScore
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pose update failed" });
  }
};

// Get pose history for a session
exports.getPoseHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      success: true,
      poseHistory: session.poseHistory,
      averageScore: session.averagePoseScore,
      totalPoses: session.totalPosesCompleted,
      bestScore: session.bestPoseScore
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pose history" });
  }
};