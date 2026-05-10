const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * GET /api/history
 * Get all user session history
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const Session = mongoose.model('Session');
    
    const sessions = await Session.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      emotion: session.emotion,
      modalities: session.modalities,
      yogaPlan: session.yogaPlan,
      completed: session.completed,
      completionRatio: session.completionRatio,
      rating: session.rating,
      totalDuration: session.totalDuration,
      poseHistory: session.poseHistory,
      averagePoseScore: session.averagePoseScore,
      totalPosesCompleted: session.totalPosesCompleted,
      bestPoseScore: session.bestPoseScore,
      createdAt: session.createdAt
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

/**
 * GET /api/history/:sessionId
 * Get detailed information about a specific session
 */
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const Session = mongoose.model('Session');
    const { sessionId } = req.params;

    const session = await Session.findOne({ 
      _id: sessionId, 
      userId: req.userId 
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        emotion: session.emotion,
        modalities: session.modalities,
        yogaPlan: session.yogaPlan,
        completed: session.completed,
        completionRatio: session.completionRatio,
        rating: session.rating,
        totalDuration: session.totalDuration,
        poseHistory: session.poseHistory,
        averagePoseScore: session.averagePoseScore,
        totalPosesCompleted: session.totalPosesCompleted,
        bestPoseScore: session.bestPoseScore,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Session detail fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session details' });
  }
});

/**
 * GET /api/history/summary/stats
 * Get summary statistics of user's history
 */
router.get('/summary/stats', authenticateToken, async (req, res) => {
  try {
    const Session = mongoose.model('Session');
    
    const sessions = await Session.find({ userId: req.userId });

    // Calculate statistics
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    
    // Emotion distribution
    const emotionCounts = {};
    sessions.forEach(session => {
      const emotion = session.emotion || 'neutral';
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    // Most common emotion
    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    // Average scores
    const avgCompletionRatio = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.completionRatio || 0), 0) / sessions.length
      : 0;

    const avgPoseScore = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.averagePoseScore || 0), 0) / sessions.length
      : 0;

    // Total poses completed
    const totalPoses = sessions.reduce((sum, s) => sum + (s.totalPosesCompleted || 0), 0);

    // Best pose score ever
    const bestPoseScore = Math.max(...sessions.map(s => s.bestPoseScore || 0), 0);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = sessions.filter(s => new Date(s.createdAt) >= sevenDaysAgo).length;

    res.json({
      success: true,
      summary: {
        totalSessions,
        completedSessions,
        completionRate: Math.round(avgCompletionRatio * 100),
        emotionDistribution: emotionCounts,
        mostCommonEmotion,
        averagePoseScore: Math.round(avgPoseScore),
        totalPosesCompleted: totalPoses,
        bestPoseScore: Math.round(bestPoseScore),
        recentActivity: recentSessions
      }
    });
  } catch (error) {
    console.error('Summary stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary statistics' });
  }
});

/**
 * DELETE /api/history/:sessionId
 * Delete a specific session (optional feature)
 */
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const Session = mongoose.model('Session');
    const { sessionId } = req.params;

    const result = await Session.deleteOne({ 
      _id: sessionId, 
      userId: req.userId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Session delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
});

module.exports = router;

// Made with Bob
