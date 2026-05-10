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
 * GET /api/profile
 * Get user profile information
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        health: user.health || '',
        emotionalGoals: user.emotionalGoals || [],
        yogaExperience: user.yogaExperience,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/profile
 * Update user profile information
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, age, gender, health, emotionalGoals, yogaExperience } = req.body;
    
    const User = mongoose.model('User');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (health !== undefined) user.health = health;
    if (emotionalGoals) user.emotionalGoals = emotionalGoals;
    if (yogaExperience) user.yogaExperience = yogaExperience;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        health: user.health,
        emotionalGoals: user.emotionalGoals,
        yogaExperience: user.yogaExperience
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

/**
 * GET /api/profile/stats
 * Get user statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const Session = mongoose.model('Session');
    const UserProfile = mongoose.model('UserProfile');
    
    // Get user profile stats
    const userProfile = await UserProfile.findOne({ userId: req.userId });
    
    // Get session count
    const totalSessions = await Session.countDocuments({ userId: req.userId });
    
    // Get completed sessions
    const completedSessions = await Session.countDocuments({ 
      userId: req.userId, 
      completed: true 
    });
    
    // Get average completion ratio
    const sessions = await Session.find({ userId: req.userId });
    const avgCompletion = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.completionRatio || 0), 0) / sessions.length
      : 0;
    
    // Get emotion distribution
    const emotionCounts = {};
    sessions.forEach(session => {
      const emotion = session.emotion || 'neutral';
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalSessions,
        completedSessions,
        avgCompletion: Math.round(avgCompletion * 100),
        emotionStats: userProfile?.emotionStats || emotionCounts,
        avgRating: userProfile?.avg_rating || 0,
        totalPosesCompleted: sessions.reduce((sum, s) => sum + (s.totalPosesCompleted || 0), 0)
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

module.exports = router;

// Made with Bob
