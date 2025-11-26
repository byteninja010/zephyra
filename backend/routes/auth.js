const express = require('express');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

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
        moodHistory: user.moodHistory,
        reflections: user.reflections,
        activityHistory: user.activityHistory
      },
      message: 'Secret code validated successfully'
    });

  } catch (error) {
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
        moodHistory: user.moodHistory,
        reflections: user.reflections,
        activityHistory: user.activityHistory
      }
    });

  } catch (error) {
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user onboarding data
router.put('/user/:firebaseUid/onboarding', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { nickname, ageRange, mood, moodNote, goals, preferredSupport } = req.body;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update onboarding fields
    if (nickname !== undefined) user.nickname = nickname || null;
    if (ageRange !== undefined) user.ageRange = ageRange || null;
    if (goals !== undefined) user.goals = goals || [];
    if (preferredSupport !== undefined) user.preferredSupport = preferredSupport || [];
    
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
        onboardingCompleted: user.onboardingCompleted
      }
    });

  } catch (error) {
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

    // Log mood check-in activity
    user.activityHistory.push({
      type: 'moodCheckIn',
      date: date ? new Date(date) : new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Mood saved successfully',
      moodHistory: user.moodHistory
    });

  } catch (error) {
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

    // Generate Gemini appreciation comment
    let geminiComment = '';
    try {
      const moodLabels = {
        grateful: 'grateful',
        proud: 'proud',
        hopeful: 'hopeful',
        peaceful: 'peaceful',
        inspired: 'inspired',
        content: 'content'
      };

      const moodLabel = moodLabels[mood] || mood;

      const prompt = `A user has written a personal reflection about their mental wellness journey. Please generate a warm, supportive, and encouraging response.

USER'S REFLECTION:
Mood: ${moodLabel}
Category: ${category}
Reflection: "${text}"

INSTRUCTIONS:
- Give more priority to Reflection than the other fields.
- Generate a personalized, heartfelt appreciation message (2-3 sentences)
- Acknowledge their specific reflection and the courage it took to share
- Be empathetic, supportive, and encouraging
- Use warm, caring language that validates their feelings
- Focus on positive reinforcement and growth
- Keep it genuine and personal (not generic)
- Maximum 70 words
- Do NOT use "User" or any name prefix
- Start directly with the supportive message

Generate an uplifting response that makes them feel heard, valued, and encouraged:`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 150
        }
      });

      geminiComment = result.candidates[0].content.parts[0].text.trim();
      
    } catch (geminiError) {
      console.error('Error generating Gemini comment:', geminiError);
      // Fallback appreciation messages based on mood
      const fallbackMessages = {
        grateful: "Thank you for sharing what you're grateful for. Your ability to recognize and appreciate the positive moments in your life is truly beautiful and shows great emotional awareness.",
        proud: "Your pride in your accomplishments is well-deserved! Celebrating your wins, big or small, is an important part of your growth journey. Keep recognizing your strength!",
        hopeful: "Your hope shines through your words. Holding onto hope during challenging times takes courage, and you're doing wonderfully. Keep nurturing that optimism!",
        peaceful: "Finding and acknowledging peace within yourself is a precious gift. Thank you for taking the time to reflect on these calm moments. Your mindfulness is inspiring.",
        inspired: "Your sense of inspiration is contagious! It's beautiful to see you connecting with moments that spark your creativity and motivation. Keep following that light!",
        content: "Your contentment radiates through your reflection. Being present and finding satisfaction in the moment is a wonderful practice. Thank you for sharing this peaceful insight."
      };
      
      geminiComment = fallbackMessages[mood] || "Thank you for taking the time to reflect and share your thoughts. Your self-awareness and commitment to your wellness journey is truly admirable. Keep nurturing your growth!";
    }

    // Add new reflection with Gemini comment
    user.reflections.push({
      text,
      mood,
      category,
      date: new Date(),
      geminiComment: geminiComment
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
    console.error('Error saving reflection:', error);
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete reflection
router.delete('/user/:firebaseUid/reflection/:reflectionId', async (req, res) => {
  try {
    const { firebaseUid, reflectionId } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find and remove the reflection
    const reflectionIndex = user.reflections.findIndex(
      ref => ref._id.toString() === reflectionId
    );

    if (reflectionIndex === -1) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    user.reflections.splice(reflectionIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Reflection deleted successfully',
      reflections: user.reflections
    });

  } catch (error) {
    console.error('Error deleting reflection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate personalized quote based on user's mood history
router.get('/user/:firebaseUid/personalized-quote', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent mood history (last 7 days)
    const recentMoods = user.moodHistory || [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMoodHistory = recentMoods.filter(mood => 
      new Date(mood.date) >= sevenDaysAgo
    );

    // Generate personalized quote using Gemini AI
    let personalizedQuote = '';
    try {
      const moodContext = recentMoodHistory.length > 0 
        ? recentMoodHistory.map(mood => `${mood.mood}${mood.note ? ` (${mood.note})` : ''}`).join(', ')
        : 'No recent mood data available';

      const quotePrompt = `Generate a personalized, encouraging wellness quote based on recent mood history.

USER CONTEXT:
- Recent mood history: ${moodContext}
- Goals: ${user.goals?.join(', ') || 'General wellness'}
- Age range: ${user.ageRange || 'Not specified'}

REQUIREMENTS:
- Create a motivational, supportive quote (1-2 sentences)
- Make it personal and relevant to their mood patterns
- Keep it uplifting and encouraging
- Focus on mental wellness and self-care
- Use warm, caring language
- Maximum 150 characters
- Do NOT include "User," or any name prefix in the quote
- Start the quote directly with the motivational message
- No quotes or special characters around the text

Generate a personalized quote that will inspire and motivate:`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: quotePrompt,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 100
        }
      });

      personalizedQuote = result.candidates[0].content.parts[0].text.trim();
      
      // Clean up the quote (remove quotes if present)
      personalizedQuote = personalizedQuote.replace(/^["']|["']$/g, '');
      
    } catch (geminiError) {
      // Fallback quotes based on recent mood
      const lastMood = recentMoodHistory[recentMoodHistory.length - 1]?.mood;
      
      const fallbackQuotes = {
        happy: "Your joy is contagious and your positivity lights up the world around you.",
        neutral: "Every small step forward is progress worth celebrating.",
        sad: "It's okay to feel this way. You're stronger than you know, and better days are ahead.",
        anxious: "Take a deep breath. You've overcome challenges before, and you'll overcome this too.",
        tired: "Rest is not giving up; it's preparing for the journey ahead.",
        calm: "Your inner peace is a gift that radiates outward to everyone around you.",
        frustrated: "Challenges are opportunities in disguise. You have the strength to transform them.",
        hopeful: "Your hope is a beacon of light that guides you through any darkness."
      };
      
      personalizedQuote = fallbackQuotes[lastMood] || "Your wellness journey is unique and beautiful. Keep going, one step at a time.";
    }

    res.json({
      success: true,
      quote: personalizedQuote,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

