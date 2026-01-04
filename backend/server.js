// ==================== IMPORTS ====================
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const serRoutes = require("./routes/ser");
const sterRoutes = require("./routes/ster");

// ==================== APP SETUP ====================
const app = express();
app.use(express.json());

// ✅ CORS CONFIG — must come before routes
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindease';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// ==================== USER SCHEMA ====================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  age: { type: Number, required: true, min: 10, max: 100 },
  gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
  health: { type: String, trim: true, default: '' },
  emotionalGoals: { type: [String], default: [] },
  yogaExperience: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'] },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// ==================== ROUTES ====================
app.use("/api/emotion", sterRoutes);
app.use("/api/emotion", serRoutes);




// ✅ Health Check (for testing on mobile browser)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
  });
});

// ✅ Register Route
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, age, gender, health, emotionalGoals, yogaExperience } = req.body;

    if (!name || !email || !password || !age || !gender || !yogaExperience) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = new User({
      name,
      email,
      password,
      age,
      gender,
      health,
      emotionalGoals: emotionalGoals || [],
      yogaExperience,
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        health: user.health,
        emotionalGoals: user.emotionalGoals,
        yogaExperience: user.yogaExperience,
      },
    });
  } catch (error) {
    console.error('💥 Registration error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
});

// ✅ Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        emotionalGoals: user.emotionalGoals,
        yogaExperience: user.yogaExperience,
      },
    });
  } catch (error) {
    console.error('💥 Login error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
});

// ✅ Protected Route (optional)
app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API Base: https://localhost:${PORT}/api`);
  console.log(`📍 Health Check: https://localhost:${PORT}/api/health`);
});
