const Session = require("../models/Session");
const UserProfile = require("../models/UserProfile");

exports.updatePoseScore = async (req, res) => {
  try {
    const { sessionId, poseScore } = req.body;

    const completionRatio = poseScore / 100;

    const session = await Session.findByIdAndUpdate(
      sessionId,
      {
        completionRatio,
        completed: completionRatio > 0.7,
      },
      { new: true }
    );

    await UserProfile.findOneAndUpdate(
      { userId: session.userId },
      {
        $inc: { totalSessions: 1 },
        $set: { avg_completion: completionRatio },
      }
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pose update failed" });
  }
};