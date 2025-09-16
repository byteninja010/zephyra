const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'audio'],
    default: 'text'
  },
  audioUrl: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  messages: [messageSchema],
  context: {
    userProfile: {
      nickname: String,
      ageRange: String,
      goals: [String],
      preferredSupport: [String],
      moodHistory: [{
        mood: String,
        note: String,
        date: Date
      }],
      reflections: [{
        text: String,
        mood: String,
        category: String,
        date: Date
      }]
    },
    conversationContext: {
      currentMood: String,
      topics: [String],
      concerns: [String],
      goals: [String]
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
