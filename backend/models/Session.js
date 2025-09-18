const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true
    },
    time: {
      type: String,
      required: true // Format: "HH:MM" (24-hour)
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }], // For weekly/monthly schedules
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  sessionData: {
    backgroundImage: {
      type: String, // URL to generated background
      default: null
    },
    backgroundPrompt: {
      type: String, // The prompt used to generate the background
      default: null
    },
    greeting: {
      type: String,
      default: null
    },
    moodCheckIn: {
      mood: String,
      note: String,
      timestamp: Date
    },
    exploration: [{
      userMessage: String,
      aiResponse: String,
      timestamp: Date
    }],
    copingTool: {
      type: String, // Type of coping tool (breathing, journaling, visualization)
      exercise: String, // The actual exercise content
      audioUrl: String, // TTS audio for the exercise
      timestamp: Date
    },
    reflection: {
      summary: String,
      keyInsights: [String],
      nextSteps: [String],
      timestamp: Date
    },
    closure: {
      message: String,
      encouragement: String,
      timestamp: Date
    }
  },
  lastSessionSummary: {
    type: String,
    default: null
  },
  nextSessionDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to calculate next session date
sessionSchema.methods.calculateNextSession = function() {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const scheduledTime = parseInt(this.schedule.time.split(':')[0]) * 60 + parseInt(this.schedule.time.split(':')[1]);
  
  let nextDate = new Date(now);
  
  switch (this.schedule.frequency) {
    case 'daily':
      if (currentTime >= scheduledTime) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;
    case 'weekly':
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDays = this.schedule.days.map(day => dayNames.indexOf(day));
      const currentDay = now.getDay();
      
      // Find next occurrence
      let daysUntilNext = 0;
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (targetDays.includes(checkDay)) {
          daysUntilNext = i;
          break;
        }
      }
      nextDate.setDate(nextDate.getDate() + daysUntilNext);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  // Set the time
  const [hours, minutes] = this.schedule.time.split(':');
  nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return nextDate;
};

module.exports = mongoose.model('Session', sessionSchema);
