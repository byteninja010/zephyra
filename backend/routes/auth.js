const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Generate a user-friendly secret code (8 characters, alphanumeric)
const generateSecretCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create or get user with secret code
router.post('/create-user', async (req, res) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    // Check if user already exists
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // User exists, return their secret code
      return res.json({
        success: true,
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          secretCode: user.secretCode,
          createdAt: user.createdAt
        },
        message: 'User already exists'
      });
    }

    // Generate unique secret code
    let secretCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      secretCode = generateSecretCode();
      const existingUser = await User.findOne({ secretCode });
      if (!existingUser) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique secret code' });
    }

    // Create new user
    user = new User({
      firebaseUid,
      secretCode
    });

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        secretCode: user.secretCode,
        createdAt: user.createdAt
      },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate secret code and get user
router.post('/validate-secret-code', async (req, res) => {
  try {
    const { secretCode } = req.body;

    if (!secretCode) {
      return res.status(400).json({ error: 'Secret code is required' });
    }

    // Find user by secret code
    const user = await User.findOne({ secretCode, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'Invalid secret code' });
    }

    // Update last login
    await user.updateLastLogin();

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        secretCode: user.secretCode,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        onboardingCompleted: user.onboardingCompleted,
        nickname: user.nickname,
        ageRange: user.ageRange,
        goals: user.goals,
        preferredSupport: user.preferredSupport,
        emergencyContactEmail: user.emergencyContactEmail,
        moodHistory: user.moodHistory,
        reflections: user.reflections,
        activityHistory: user.activityHistory
      },
      message: 'Secret code validated successfully'
    });

  } catch (error) {
    console.error('Error validating secret code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by Firebase UID
router.get('/user/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        secretCode: user.secretCode,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        onboardingCompleted: user.onboardingCompleted,
        nickname: user.nickname,
        ageRange: user.ageRange,
        goals: user.goals,
        preferredSupport: user.preferredSupport,
        emergencyContactEmail: user.emergencyContactEmail,
        moodHistory: user.moodHistory,
        reflections: user.reflections,
        activityHistory: user.activityHistory
      }
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user last login
router.put('/user/:firebaseUid/last-login', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.updateLastLogin();

    res.json({
      success: true,
      message: 'Last login updated successfully',
      lastLogin: user.lastLogin
    });

  } catch (error) {
    console.error('Error updating last login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user onboarding data
router.put('/user/:firebaseUid/onboarding', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { nickname, ageRange, mood, moodNote, goals, preferredSupport, emergencyContactEmail } = req.body;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update onboarding fields
    if (nickname !== undefined) user.nickname = nickname || null;
    if (ageRange !== undefined) user.ageRange = ageRange || null;
    if (goals !== undefined) user.goals = goals || [];
    if (preferredSupport !== undefined) user.preferredSupport = preferredSupport || [];
    if (emergencyContactEmail !== undefined) user.emergencyContactEmail = emergencyContactEmail || null;
    
    // Add initial mood to mood history if provided
    if (mood) {
      user.moodHistory.push({
        mood,
        note: moodNote || '',
        date: new Date()
      });
    }

    // Mark onboarding as completed
    user.onboardingCompleted = true;

    await user.save();

    res.json({
      success: true,
      message: 'Onboarding data saved successfully',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        nickname: user.nickname,
        ageRange: user.ageRange,
        goals: user.goals,
        preferredSupport: user.preferredSupport,
        emergencyContactEmail: user.emergencyContactEmail,
        onboardingCompleted: user.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('Error updating onboarding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit mood
router.post('/user/:firebaseUid/mood', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { mood, note, date } = req.body;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add new mood to history
    user.moodHistory.push({
      mood,
      note: note || '',
      date: date ? new Date(date) : new Date()
    });

    // Keep only last 7 days of mood data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    user.moodHistory = user.moodHistory.filter(moodEntry => 
      new Date(moodEntry.date) >= sevenDaysAgo
    );

    await user.save();

    res.json({
      success: true,
      message: 'Mood saved successfully',
      moodHistory: user.moodHistory
    });

  } catch (error) {
    console.error('Error submitting mood:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit reflection
router.post('/user/:firebaseUid/reflection', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { text, mood, category } = req.body;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add new reflection
    user.reflections.push({
      text,
      mood,
      category,
      date: new Date()
    });

    // Add to activity history
    user.activityHistory.push({
      type: 'reflection',
      date: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Reflection saved successfully',
      reflections: user.reflections
    });

  } catch (error) {
    console.error('Error submitting reflection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log activity
router.post('/user/:firebaseUid/activity', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { type } = req.body;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add to activity history
    user.activityHistory.push({
      type,
      date: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Activity logged successfully',
      activityHistory: user.activityHistory
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user reflections
router.get('/user/:firebaseUid/reflections', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      reflections: user.reflections
    });

  } catch (error) {
    console.error('Error getting reflections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity history
router.get('/user/:firebaseUid/activities', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      activityHistory: user.activityHistory
    });

  } catch (error) {
    console.error('Error getting activity history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

