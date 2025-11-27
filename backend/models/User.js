const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  secretCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  pseudonym: {
    type: String,
    unique: true,
    sparse: true, // Allow null values to be non-unique
    index: true
  },
  // Onboarding fields
  nickname: {
    type: String,
    default: null
  },
  ageRange: {
    type: String,
    enum: ['13-17', '18-25', '26-35', '36-50', '51+', null],
    default: null
  },
  moodHistory: [{
    mood: {
      type: String,
      required: true
    },
    note: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  reflections: [{
    text: {
      type: String,
      required: true
    },
    mood: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    geminiComment: {
      type: String,
      default: null
    }
  }],
  activityHistory: [{
    type: {
      type: String,
      required: true,
      enum: ['moodCheckIn', 'therapyVisit', 'breathingExercise', 'reflection', 'mindCanvas', 'forumPost', 'chatSession']
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  goals: [{
    type: String
  }],
  preferredSupport: [{
    type: String
  }],
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  // User context for AI - stores cumulative session summary
  userContext: {
    cumulativeSessionSummary: {
      type: String,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update lastLogin when user signs in
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by secret code (with hash comparison)
userSchema.statics.findBySecretCode = async function(plainSecretCode) {
  if (!plainSecretCode) {
    return null;
  }
  
  // Get all active users and compare hashes
  // Note: This is necessary because we can't query by hashed values directly
  const users = await this.find({ isActive: true });
  
  for (const user of users) {
    // Check if secretCode is already hashed (starts with $2a$, $2b$, or $2y$)
    const isHashed = user.secretCode && /^\$2[ayb]\$\d+\$/.test(user.secretCode);
    
    if (isHashed) {
      // Compare with bcrypt
      const isMatch = await bcrypt.compare(plainSecretCode, user.secretCode);
      if (isMatch) {
        return user;
      }
    } else {
      // Legacy: plain text comparison (for backward compatibility during migration)
      if (user.secretCode === plainSecretCode) {
        return user;
      }
    }
  }
  
  return null;
};

module.exports = mongoose.model('User', userSchema);

