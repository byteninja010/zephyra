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
        lastLogin: user.lastLogin
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
        lastLogin: user.lastLogin
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

module.exports = router;
