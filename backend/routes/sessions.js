const express = require('express');
const Session = require('../models/Session');
const { GoogleGenAI } = require('@google/genai');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Retry function for Gemini API calls with exponential backoff
async function retryGeminiCall(apiCall, maxRetries = 5, baseDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Gemini API attempt ${attempt}/${maxRetries}`);
      const result = await apiCall();
      console.log(`✅ Gemini API call successful on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.log(`⚠️ Gemini API attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.log(`❌ All ${maxRetries} attempts failed, giving up`);
        throw error; // Re-throw on final attempt
      }
      
      // Check if it's a retryable error (503, 429, 500)
      if (error.status === 503 || error.status === 429 || error.status === 500) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log(`❌ Non-retryable error (${error.status}), giving up`);
        throw error; // Don't retry for non-retryable errors
      }
    }
  }
}

// Helper function to get last session summary from MongoDB
const getLastSessionSummary = async (firebaseUid) => {
  try {
    const lastSession = await Session.findOne({ 
      firebaseUid, 
      status: 'completed' 
    }).sort({ completedAt: -1 });
    
    if (lastSession && lastSession.lastSessionSummary) {
      return lastSession.lastSessionSummary;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting last session summary:', error);
    return null;
  }
};

// Helper function to generate personalized greeting
const generatePersonalizedGreeting = async (userContext, lastSessionSummary, maxTokens = 150) => {
  try {
    const greetingPrompt = `Generate a warm, personalized greeting for a mental wellness session. 
    User context: ${userContext ? JSON.stringify(userContext) : 'No specific context available'}
    Last session summary: ${lastSessionSummary || 'This is their first session'}
    
    The greeting should be:
    - Warm and supportive
    - Reference their last session if available
    - Set a positive tone for the session
    - Be 2-3 sentences long
    - Use their name if available`;

    const greetingResult = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: greetingPrompt,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: maxTokens
      }
    });

    return greetingResult.candidates[0].content.parts[0].text;
  } catch (error) {
    console.log('⚠️ Greeting generation failed, using default:', error.message);
    return `Welcome to your wellness session! I'm here to support you today. ${lastSessionSummary ? 'I see we have some previous sessions to build upon.' : 'Let\'s start this journey together.'} How are you feeling right now?`;
  }
};

// Helper function to format session response
const formatSessionResponse = (session, message = 'Session retrieved successfully') => {
  return {
    success: true,
    session: {
      sessionId: session.sessionId,
      status: session.status,
      backgroundImage: session.sessionData?.backgroundImage,
      backgroundPrompt: session.sessionData?.backgroundPrompt,
      greeting: session.sessionData?.greeting,
      schedule: session.schedule,
      nextSessionDate: session.nextSessionDate,
      lastSessionSummary: session.lastSessionSummary
    },
    message
  };
};

// Helper function to handle errors consistently
const handleError = (res, error, message = 'Internal server error') => {
  console.error(message, error);
  res.status(500).json({ error: message });
};

// Helper function to generate personalized background using Gemini
const generateSessionBackground = async (userContext, sessionType = 'general') => {
  try {
    console.log('🎨 Generating personalized session background...');
    
    // For now, return a simple placeholder since image generation is complex
    // TODO: Implement proper image generation when needed
    console.log('⚠️ Using placeholder background (image generation not implemented)');
    
    return {
      imageData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      mimeType: 'image/gif',
      prompt: 'Calming wellness session background'
    };

  } catch (error) {
    console.error('Error generating session background:', error);
    return null;
  }
};

// Create a new session schedule
router.post('/create', async (req, res) => {
  try {
    const { firebaseUid, schedule } = req.body;

    if (!firebaseUid || !schedule) {
      return res.status(400).json({ error: 'Firebase UID and schedule are required' });
    }

    // Validate schedule
    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      return res.status(400).json({ error: 'Invalid frequency. Must be daily, weekly, or monthly' });
    }

    if (!schedule.time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM (24-hour format)' });
    }

    // Check if user already has a session schedule
    const existingSession = await Session.findOne({ firebaseUid, status: { $in: ['scheduled', 'active'] } });
    if (existingSession) {
      return res.status(400).json({ error: 'User already has an active session schedule' });
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new session
    const session = new Session({
      firebaseUid,
      sessionId,
      schedule,
      nextSessionDate: new Date() // Will be calculated properly in the method
    });

    // Calculate next session date
    session.nextSessionDate = session.calculateNextSession();

    await session.save();

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        schedule: session.schedule,
        nextSessionDate: session.nextSessionDate,
        status: session.status
      },
      message: 'Session schedule created successfully'
    });

  } catch (error) {
    handleError(res, error, 'Error creating session schedule');
  }
});

// Get user's session schedule
router.get('/schedule/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const session = await Session.findOne({ 
      firebaseUid, 
      status: { $in: ['scheduled', 'active'] } 
    });

    if (!session) {
      return res.json({
        success: true,
        session: null,
        message: 'No active session schedule found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        schedule: session.schedule,
        nextSessionDate: session.nextSessionDate,
        status: session.status,
        lastSessionSummary: session.lastSessionSummary
      }
    });

  } catch (error) {
    handleError(res, error, 'Error getting session schedule');
  }
});

// Start an instant session (for testing)
router.post('/start-instant', async (req, res) => {
  try {
    console.log('🚀 Starting instant session...');
    const { firebaseUid, userContext } = req.body;
    console.log('Request body:', { firebaseUid, userContext });

    if (!firebaseUid) {
      console.log('❌ No Firebase UID provided');
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    // Check if there's already an active instant session for this user
    let session = await Session.findOne({ 
      firebaseUid, 
      status: 'active',
      sessionId: { $regex: /^session-instant_/ }
    });

    if (session) {
      console.log('✅ Found existing active session:', session.sessionId);
      return res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          status: session.status,
          backgroundImage: session.sessionData.backgroundImage,
          backgroundPrompt: session.sessionData.backgroundPrompt,
          greeting: session.sessionData.greeting
        },
        message: 'Using existing active session'
      });
    }

    // Create a new temporary session for instant start
    const sessionId = `session-instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    session = new Session({
      firebaseUid,
      sessionId,
      schedule: {
        frequency: 'daily',
        time: new Date().toTimeString().slice(0, 5),
        days: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      status: 'active',
      nextSessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });

    // Generate personalized background
    const backgroundData = await generateSessionBackground(userContext);
    
    // Update session with background
    if (backgroundData) {
      session.sessionData.backgroundImage = `data:${backgroundData.mimeType};base64,${backgroundData.imageData}`;
      session.sessionData.backgroundPrompt = backgroundData.prompt;
    }

    // Get last session summary from MongoDB
    const lastSessionSummary = await getLastSessionSummary(firebaseUid);
    
    // Generate greeting with context
    const greeting = await generatePersonalizedGreeting(userContext, lastSessionSummary, 150);
    session.sessionData.greeting = greeting;
    console.log('✅ Generated personalized greeting');

    await session.save();
    console.log('✅ Session saved successfully:', session.sessionId);

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        backgroundImage: session.sessionData.backgroundImage,
        backgroundPrompt: session.sessionData.backgroundPrompt,
        greeting: session.sessionData.greeting
      },
      message: 'Instant session started successfully'
    });

  } catch (error) {
    handleError(res, error, 'Error starting instant session');
  }
});

// Get upcoming sessions for a user
router.get('/upcoming/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 5 } = req.query;

    // Get all sessions, excluding completed/cancelled ones
    const allSessions = await Session.find({
      firebaseUid,
      status: { $in: ['scheduled', 'active'] },
      nextSessionDate: { $gte: new Date() }
    })
    .sort({ createdAt: -1 }) // Sort by creation date, newest first
    .select('sessionId schedule nextSessionDate status createdAt');

    // Deduplicate sessions - keep only the most recent of each type
    const deduplicatedSessions = [];
    const seenTypes = new Set();

    for (const session of allSessions) {
      const sessionType = session.sessionId.startsWith('session-instant_') ? 'instant' : 'scheduled';
      
      // Only add if we haven't seen this type before
      if (!seenTypes.has(sessionType)) {
        seenTypes.add(sessionType);
        deduplicatedSessions.push(session);
      }
    }

    // Limit the results
    const sessions = deduplicatedSessions.slice(0, parseInt(limit));

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    handleError(res, error, 'Error getting upcoming sessions');
  }
});

// Complete a session and generate summary
router.post('/complete/:sessionId', async (req, res) => {
  try {
    console.log('🔍 SESSION COMPLETION TEST - Starting');
    const { sessionId } = req.params;
    const { firebaseUid, summary, secretCode } = req.body;
    
    console.log(`Session ID: ${sessionId}`);
    console.log(`Firebase UID: ${firebaseUid}`);
    console.log(`Secret Code: ${secretCode}`);
    console.log(`Optional summary: ${summary}`);
    console.log('Full request body:', req.body);
    
    let finalFirebaseUid = firebaseUid;
    
    // Fallback: Try to get firebaseUid from secret code if not provided
    if (!finalFirebaseUid && secretCode) {
      console.log('🔄 Trying fallback with secret code:', secretCode);
      
      try {
        const User = require('../models/User');
        const user = await User.findOne({ secretCode, isActive: true });
        if (user) {
          finalFirebaseUid = user.firebaseUid;
          console.log('✅ Retrieved firebaseUid from secret code:', finalFirebaseUid);
        } else {
          console.log('❌ No user found with secret code:', secretCode);
        }
      } catch (error) {
        console.error('Error looking up user by secret code:', error);
      }
    }
    
    if (!finalFirebaseUid) {
      console.log('❌ Firebase UID is missing from request body and secret code lookup failed');
      console.log('❌ Available data:', { firebaseUid, secretCode, sessionId });
      return res.status(400).json({ 
        error: 'Firebase UID is required',
        receivedBody: req.body,
        message: 'Please ensure firebaseUid is included in the request body or provide secretCode as fallback',
        debugInfo: {
          sessionId,
          providedFirebaseUid: firebaseUid,
          providedSecretCode: secretCode,
          timestamp: new Date().toISOString()
        }
      });
    }

    const session = await Session.findOne({ sessionId, firebaseUid: finalFirebaseUid });
    if (!session) {
      console.log('❌ Session not found');
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`Session status: ${session.status}`);
    if (session.status !== 'active') {
      console.log('❌ Session is not active');
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Get the most recent cumulative summary from user's reflections
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: finalFirebaseUid, isActive: true });
    const previousCumulativeSummary = user?.reflections
      ?.filter(r => r.category === 'cumulative_session_summary')
      ?.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.text || '';
    
    console.log('🔍 CUMULATIVE SUMMARY TEST - Step 1: Retrieving previous summary');
    console.log(`Previous cumulative summary length: ${previousCumulativeSummary.length} characters`);
    console.log(`Previous cumulative summary preview: ${previousCumulativeSummary.substring(0, 100)}...`);

    // Generate new session summary
    let newSessionSummary = '';
    try {

      const sessionPrompt = `Please create a comprehensive summary for this single mental wellness session.

SESSION DATA:
- Session ID: ${session.sessionId}
- Mood Check-in: ${session.sessionData?.moodCheckIn?.mood || 'Not recorded'}${session.sessionData?.moodCheckIn?.note ? ' - ' + session.sessionData.moodCheckIn.note : ''}
- Exploration Conversations: ${session.sessionData?.exploration?.length || 0} exchanges
- Coping Tool Used: ${session.sessionData?.copingTool?.type || 'None'}
- Session Insights: ${session.sessionData?.reflection?.keyInsights?.join(', ') || 'None'}
- Next Steps: ${session.sessionData?.reflection?.nextSteps?.join(', ') || 'None'}

CONVERSATION HISTORY:
${session.sessionData?.exploration?.map((exchange, index) => 
  `Exchange ${index + 1}:
  User: ${exchange.userMessage}
  AI: ${exchange.aiResponse}
  Time: ${exchange.timestamp}`
).join('\n\n') || 'No conversation history'}

Create a detailed summary (approximately 300-500 words) of this single session including:
1. Key topics discussed
2. Emotional state and mood progression
3. Insights gained
4. Coping strategies explored
5. Actionable next steps
6. Overall session impact

Focus only on this specific session.`;

      const sessionResult = await retryGeminiCall(() => 
        genAI.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: sessionPrompt,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000
          }
        })
      );

      newSessionSummary = sessionResult.candidates[0].content.parts[0].text;
      console.log('🔍 CUMULATIVE SUMMARY TEST - Step 2: Generated new session summary');
      console.log(`New session summary length: ${newSessionSummary.length} characters`);
      console.log(`New session summary preview: ${newSessionSummary.substring(0, 100)}...`);
    } catch (summaryError) {
      console.error('Error generating session summary:', summaryError);
      newSessionSummary = `Session completed on ${new Date().toISOString()}. Key topics discussed: ${session.sessionData?.exploration?.length || 0} conversation exchanges. Mood: ${session.sessionData?.moodCheckIn?.mood || 'Not recorded'}.`;
    }

    // Now create cumulative summary combining old + new
    let cumulativeSummary = '';
    try {

      const cumulativePrompt = `Please create a consolidated cumulative summary by combining the previous cumulative summary with the new session summary.

PREVIOUS CUMULATIVE SUMMARY:
${previousCumulativeSummary || 'No previous sessions - this is the first session.'}

NEW SESSION SUMMARY:
${newSessionSummary}

INSTRUCTIONS:
1. Combine both summaries into ONE comprehensive summary
2. EXACTLY 1000 words (no more, no less)
3. Preserve all important information from both summaries
4. Maintain chronological progression
5. Keep insights, patterns, and therapeutic progress
6. Ensure continuity and flow between old and new content
7. Focus on the most important and impactful information

Create a professional therapeutic cumulative summary that captures the complete journey while staying within exactly 1000 words.`;

      const cumulativeResult = await retryGeminiCall(() => 
        genAI.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: cumulativePrompt,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        })
      );

      cumulativeSummary = cumulativeResult.candidates[0].content.parts[0].text;
      console.log('🔍 CUMULATIVE SUMMARY TEST - Step 3: Generated cumulative summary');
      console.log(`Final cumulative summary length: ${cumulativeSummary.length} characters`);
      console.log(`Final cumulative summary preview: ${cumulativeSummary.substring(0, 150)}...`);
      console.log('🎯 TARGET: 1000 words (~4000-5000 characters)');
    } catch (cumulativeError) {
      console.error('Error generating cumulative summary:', cumulativeError);
      cumulativeSummary = newSessionSummary; // Fallback to new session summary
    }

    // Update session with summary and mark as completed
    session.sessionData.reflection = {
      summary: newSessionSummary,
      keyInsights: session.sessionData?.reflection?.keyInsights || [],
      nextSteps: session.sessionData?.reflection?.nextSteps || [],
      timestamp: new Date()
    };
    session.status = 'completed';
    session.lastSessionSummary = newSessionSummary;

    await session.save();

    // Remove old cumulative summaries and add new one
    console.log('🔍 CUMULATIVE SUMMARY TEST - Step 4: Updating user profile');
    const removeResult = await User.findOneAndUpdate(
      { firebaseUid: finalFirebaseUid },
      {
        $pull: {
          reflections: { category: 'cumulative_session_summary' }
        }
      }
    );
    console.log(`Removed old cumulative summaries for user: ${finalFirebaseUid}`);

    // Add new cumulative summary to user's reflection history
    const addResult = await User.findOneAndUpdate(
      { firebaseUid: finalFirebaseUid },
      {
        $push: {
          reflections: {
            text: cumulativeSummary,
            mood: session.sessionData?.moodCheckIn?.mood || 'neutral',
            category: 'cumulative_session_summary',
            date: new Date()
          },
          activityHistory: {
            type: 'therapyVisit',
            date: new Date()
          }
        }
      }
    );
    console.log('✅ Added new cumulative summary to user profile');
    console.log('🔍 CUMULATIVE SUMMARY TEST - COMPLETED SUCCESSFULLY!');

    res.json({
      success: true,
      message: 'Session completed successfully',
      newSessionSummary: newSessionSummary,
      cumulativeSummary: cumulativeSummary,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clean up duplicate sessions
router.delete('/cleanup/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    // Find all instant sessions for this user
    const instantSessions = await Session.find({
      firebaseUid,
      sessionId: { $regex: /^session-instant_/ }
    }).sort({ createdAt: -1 }); // Newest first

    let deletedCount = 0;

    if (instantSessions.length > 1) {
      // Keep only the most recent instant session, delete the rest
      const sessionsToDelete = instantSessions.slice(1);
      const sessionIdsToDelete = sessionsToDelete.map(s => s._id);
      
      const result = await Session.deleteMany({
        _id: { $in: sessionIdsToDelete }
      });
      
      deletedCount = result.deletedCount;
    }

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} duplicate instant sessions`
    });

  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a session
router.post('/start/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userContext } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ error: 'Session is not in scheduled status' });
    }

    // Generate personalized background
    const backgroundData = await generateSessionBackground(userContext);
    
    // Update session status and background
    session.status = 'active';
    if (backgroundData) {
      session.sessionData.backgroundImage = `data:${backgroundData.mimeType};base64,${backgroundData.imageData}`;
      session.sessionData.backgroundPrompt = backgroundData.prompt;
    }

    // Get last session summary from Firestore
    const lastSessionSummary = await getLastSessionSummary(session.firebaseUid);
    
    // Generate greeting with context
    const greeting = await generatePersonalizedGreeting(userContext, lastSessionSummary, 200);
    session.sessionData.greeting = greeting;

    await session.save();

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        backgroundImage: session.sessionData.backgroundImage,
        backgroundPrompt: session.sessionData.backgroundPrompt,
        greeting: session.sessionData.greeting
      },
      message: 'Session started successfully'
    });

  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update session data (mood check-in, exploration, etc.)
router.post('/update/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { updateType, data } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    switch (updateType) {
      case 'moodCheckIn':
        session.sessionData.moodCheckIn = {
          mood: data.mood,
          note: data.note,
          timestamp: new Date()
        };
        break;
      
      case 'exploration':
        session.sessionData.exploration.push({
          userMessage: data.userMessage,
          aiResponse: data.aiResponse,
          timestamp: new Date()
        });
        break;
      
      case 'copingTool':
        if (!session.sessionData.copingTool) {
          session.sessionData.copingTool = {};
        }
        session.sessionData.copingTool.type = data.type;
        session.sessionData.copingTool.exercise = data.exercise;
        session.sessionData.copingTool.audioUrl = data.audioUrl;
        session.sessionData.copingTool.timestamp = new Date();
        break;
      
      case 'reflection':
        if (!session.sessionData.reflection) {
          session.sessionData.reflection = {};
        }
        session.sessionData.reflection.summary = data.summary;
        session.sessionData.reflection.keyInsights = data.keyInsights;
        session.sessionData.reflection.nextSteps = data.nextSteps;
        session.sessionData.reflection.timestamp = new Date();
        break;
      
      case 'closure':
        if (!session.sessionData.closure) {
          session.sessionData.closure = {};
        }
        session.sessionData.closure.message = data.message;
        session.sessionData.closure.encouragement = data.encouragement;
        session.sessionData.closure.timestamp = new Date();
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid update type' });
    }

    await session.save();

    res.json({
      success: true,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Helper function to calculate time remaining
const calculateTimeRemaining = (nextSessionDate) => {
  const now = new Date();
  const sessionDate = new Date(nextSessionDate);
  const diffTime = sessionDate - now;
  
  if (diffTime <= 0) {
    return { status: 'overdue', message: 'Session is overdue' };
  }
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return { 
      status: 'upcoming', 
      message: `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`,
      days: diffDays,
      hours: diffHours,
      minutes: diffMinutes
    };
  } else if (diffHours > 0) {
    return { 
      status: 'soon', 
      message: `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`,
      days: 0,
      hours: diffHours,
      minutes: diffMinutes
    };
  } else {
    return { 
      status: 'very_soon', 
      message: `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`,
      days: 0,
      hours: 0,
      minutes: diffMinutes
    };
  }
};

// Get session history
router.get('/history/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const sessions = await Session.find({ 
      firebaseUid,
      status: 'completed'
    })
    .sort({ completedAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('sessionId completedAt lastSessionSummary sessionData.reflection');

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: sessions.length
      }
    });

  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel session schedule
router.delete('/cancel/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'cancelled';
    await session.save();

    res.json({
      success: true,
      message: 'Session schedule cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
