const mongoose = require('mongoose');

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
    }
  }],
  activityHistory: [{
    type: {
      type: String,
      required: true,
      enum: ['moodCheckIn', 'therapyVisit', 'breathingExercise', 'reflection']
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
  emergencyContactEmail: {
    type: String,
    default: null
  },
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

module.exports = mongoose.model('User', userSchema);

