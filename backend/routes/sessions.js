const express = require('express');
const Session = require('../models/Session');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleAuth } = require('google-auth-library');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Initialize Vertex AI for Imagen 3
// Build credentials object from environment variables
const getGoogleCredentials = () => {
  // Use existing GOOGLE_CLOUD_* environment variables
  if (process.env.GOOGLE_CLOUD_CLIENT_EMAIL && process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
    return {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLOUD_CLIENT_EMAIL)}`,
      universe_domain: 'googleapis.com'
    };
  }
  return null;
};

const credentials = getGoogleCredentials();

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  googleAuthOptions: credentials ? { credentials } : undefined
});

// Initialize Google Auth for direct API calls
const auth = new GoogleAuth({
  credentials: credentials || undefined,
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

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
      backgroundType: session.sessionData?.backgroundType,
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

// Helper function to get user's recent mood for background generation
const getUserMoodForBackground = async (firebaseUid) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid, isActive: true });
    
    if (!user || !user.moodHistory || user.moodHistory.length === 0) {
      console.log('⚠️ No mood history found, using default: calm');
      return 'calm'; // Default mood
    }
    
    // Get the most recent mood from moodHistory (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Filter moods from last 7 days and sort by most recent
    const recentMoods = user.moodHistory
      .filter(m => new Date(m.date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (recentMoods.length > 0) {
      const latestMood = recentMoods[0].mood;
      console.log(`✅ Using latest mood from moodHistory: ${latestMood} (from ${recentMoods[0].date})`);
      return latestMood;
    }
    
    // Fallback: Get the most recent mood from all time if no moods in last 7 days
    const allMoods = user.moodHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (allMoods.length > 0) {
      const latestMood = allMoods[0].mood;
      console.log(`✅ Using latest mood (older than 7 days): ${latestMood}`);
      return latestMood;
    }
    
    console.log('⚠️ No moods found, using default: calm');
    return 'calm';
  } catch (error) {
    console.error('Error getting user mood:', error);
    return 'calm';
  }
};

// Helper function to generate personalized background using Gemini Imagen
const generateSessionBackground = async (userContext, sessionType = 'general', firebaseUid = null) => {
  try {
    console.log('🎨 Generating personalized session background with Gemini Imagen...');
    
    // Get user's current mood
    const userMood = await getUserMoodForBackground(firebaseUid || userContext?.firebaseUid);
    console.log(`📊 User mood for background: ${userMood}`);
    
    // Create mood-appropriate therapeutic nature prompts for image generation
    // Only 8 moods that match the website: happy, neutral, sad, anxious, tired, calm, frustrated, hopeful
    const moodImagePrompts = {
      'happy': 'A bright sunny meadow filled with colorful wildflowers, clear blue sky, soft sunlight, butterflies, uplifting positive energy, vibrant yet peaceful, beautiful nature photography, 4k quality',
      'neutral': 'A tranquil zen garden with smooth stones, gentle flowing water, minimalist bamboo, balanced composition, neutral calming earth tones, meditative peaceful atmosphere, professional nature photography, 4k quality',
      'sad': 'A serene sunset over calm ocean waters with warm orange and pink sky, gentle waves reflecting golden light, peaceful clouds, hopeful and soothing atmosphere, beautiful nature photography, 4k quality',
      'anxious': 'A peaceful forest path with dappled sunlight filtering through tall trees, natural green tones, moss-covered ground, grounding protective atmosphere, serene nature photography, 4k quality',
      'tired': 'A peaceful lake at golden hour with soft warm colors, gentle ripples, deeply restful atmosphere, hammock view, restorative scene, beautiful nature photography, 4k quality',
      'calm': 'A misty morning in a Japanese garden with koi pond, lily pads, cherry blossoms, perfectly balanced composition, serene and peaceful, professional nature photography, 4k quality',
      'frustrated': 'A vast open sky at dusk with slow-moving clouds, endless horizon, cool blues and purples, expansive releasing atmosphere, calming nature photography, 4k quality',
      'hopeful': 'A vibrant sunrise breaking through morning clouds, new beginnings, warm golden light over a peaceful landscape, inspiring and uplifting, beautiful nature photography, 4k quality'
    };
    
    const imagePrompt = moodImagePrompts[userMood] || moodImagePrompts['calm'];
    console.log(`🖼️ Generating image with prompt: ${imagePrompt.substring(0, 100)}...`);
    
    try {
      // Use Vertex AI Imagen 3 for image generation
      console.log('📸 ========================================');
      console.log('📸 GENERATING BACKGROUND IMAGE WITH IMAGEN 3');
      console.log('📸 Mood:', userMood);
      console.log('📸 Prompt:', imagePrompt);
      console.log('📸 ========================================');
      
      // Get access token for authentication
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken || !accessToken.token) {
        throw new Error('Failed to get access token');
      }
      
      console.log('🔐 Got authentication token');
      
      // Call Vertex AI Imagen API directly via REST
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      // Use predict endpoint with correct instances format for Imagen 3
      const apiEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
      
      console.log('📸 Calling Imagen API at:', apiEndpoint);
      
      // Correct request format with instances for Imagen 3
      const requestBody = {
        instances: [
          {
            prompt: imagePrompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          negativePrompt: "",
          seed: 1,
          addWatermark: false
        }
      };
      
      console.log('📸 Request body:', JSON.stringify(requestBody, null, 2));
      
      const result = await axios.post(apiEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📸 Imagen API Response received');
      console.log('📸 Response status:', result.status);
      
      // Parse Imagen 3 response - predictions format
      if (result.data && result.data.predictions && Array.isArray(result.data.predictions) && result.data.predictions.length > 0) {
        const prediction = result.data.predictions[0];
        
        let imageBase64 = null;
        
        // Try different field names that Imagen 3 might use
        if (prediction.bytesBase64Encoded) {
          imageBase64 = prediction.bytesBase64Encoded;
          console.log('📸 Found image in "bytesBase64Encoded" field');
        } else if (prediction.image) {
          imageBase64 = prediction.image;
          console.log('📸 Found image in "image" field');
        } else if (prediction.data) {
          imageBase64 = prediction.data;
          console.log('📸 Found image in "data" field');
        } else if (typeof prediction === 'string') {
          imageBase64 = prediction;
        }
        
        if (!imageBase64) {
          throw new Error('No image data found in prediction. Keys: ' + Object.keys(prediction).join(', '));
        }
        
        // Clean up base64 string (remove any data URL prefix if present)
        if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:')) {
          imageBase64 = imageBase64.split(',')[1];
        }
        
        const imageUrl = `data:image/png;base64,${imageBase64}`;
        
        console.log('✅ Successfully generated image with Imagen 3!');
        console.log('📏 Image data length:', imageBase64.length, 'characters');
        console.log('📸 ========================================');
        
        return {
          imageUrl: imageUrl,
          prompt: imagePrompt,
          mood: userMood,
          type: 'gemini-image',
          generatedWith: 'Imagen 3'
        };
      } else {
        throw new Error('No predictions in response or empty predictions array');
      }
    } catch (imageError) {
      console.log('⚠️ Imagen 3 generation failed:', imageError.message);
      
      // Log specific error details
      if (imageError.response) {
        console.log('📛 API Error Status:', imageError.response.status);
        
        if (imageError.response.status === 429) {
          console.log('🚨 RATE LIMIT EXCEEDED!');
          console.log('🚨 You have hit Google Cloud\'s API quota limit.');
          console.log('🚨 Solutions:');
          console.log('   1. Wait a few minutes and try again');
          console.log('   2. Check your Google Cloud quotas at: https://console.cloud.google.com/iam-admin/quotas');
          console.log('   3. Request quota increase if needed');
          console.log('   4. Make sure billing is enabled on your project');
        }
      }
      
      console.log('🔄 Falling back to mood-based gradient...');
    }
    
    // Fallback to gradient if image generation fails
    return {
      imageUrl: null,
      prompt: imagePrompt,
      mood: userMood,
      type: 'gradient'
    };

  } catch (error) {
    console.error('❌ Error generating session background:', error);
    return {
      imageUrl: null,
      prompt: 'Calming wellness session background',
      mood: 'calm',
      type: 'gradient'
    };
  }
};

// Helper function to generate therapeutic music using Lyria
const generateSessionMusic = async (userMood, sessionType = 'general', duration = 300) => {
  try {
    console.log('🎵 ========================================');
    console.log('🎵 GENERATING THERAPEUTIC MUSIC WITH LYRIA');
    console.log('🎵 Mood:', userMood);
    console.log('🎵 Duration:', duration, 'seconds');
    console.log('🎵 ========================================');
    
    // Create mood-appropriate therapeutic music prompts
    // Only 8 moods that match the website: happy, neutral, sad, anxious, tired, calm, frustrated, hopeful
    const moodMusicPrompts = {
      'happy': 'Light melodic patterns with natural harmonics, joy enhancement music, 95 BPM, positive mood amplification, bright and cheerful',
      'neutral': 'Minimalist ambient soundscape, balanced and neutral, 80 BPM, meditative background music, calming nature sounds',
      'sad': 'Tender piano with rainfall ambience, emotional support music, 55 BPM, grief processing soundscape, gentle and safe',
      'anxious': 'Deep breathing-focused ambient music, grounding bass tones, 60 BPM, anxiety relief soundscape, slow and stable',
      'tired': 'Restorative ambient music, gentle energy renewal, 65 BPM, rest and recovery soundscape, rejuvenating',
      'calm': 'Zen meditation music with singing bowls, perfect peace, 50 BPM, mindfulness support, serene atmosphere',
      'frustrated': 'Gradual release soundscape, transformative ambient tones, 70 BPM, frustration processing music, cooling and expansive',
      'hopeful': 'Sunrise-inspired ambient progression, new beginnings music, 75 BPM, optimism and possibility, emerging light'
    };
    
    const musicPrompt = moodMusicPrompts[userMood] || moodMusicPrompts['calm'];
    console.log('🎼 Music prompt:', musicPrompt);
    
    try {
      // Get access token for authentication
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken || !accessToken.token) {
        throw new Error('Failed to get access token for Lyria');
      }
      
      console.log('🔐 Got authentication token for Lyria');
      
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      // Official Lyria 2 API endpoint - Model: lyria-002
      // Documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation
      const apiEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`;
      
      console.log('🎵 Calling Lyria 2 API at:', apiEndpoint);
      
      // Official Lyria request format
      // NOTE: Lyria generates 30-second clips at 48kHz WAV (fixed duration, not customizable)
      const requestBody = {
        instances: [
          {
            prompt: musicPrompt,
            negative_prompt: "vocals, spoken word, lyrics, singing" // Instrumental only
          }
        ],
        parameters: {
          sample_count: 1 // Generate one 30-second audio sample
        }
      };
      
      console.log('🎵 Request body:', JSON.stringify(requestBody, null, 2));
      
      const result = await axios.post(apiEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90 second timeout for music generation
      });
      
      console.log('🎵 Lyria 2 API Response received');
      console.log('🎵 Response status:', result.status);
      
      // Parse Lyria response per official documentation
      // Response format: { predictions: [{ audioContent: "base64...", mimeType: "audio/wav" }] }
      if (result.data && result.data.predictions && Array.isArray(result.data.predictions) && result.data.predictions.length > 0) {
        const prediction = result.data.predictions[0];
        console.log('🎵 Prediction keys:', Object.keys(prediction));
        
        // Check for different possible field names (API may vary)
        let musicBase64 = null;
        
        if (prediction.bytesBase64Encoded) {
          musicBase64 = prediction.bytesBase64Encoded;
          console.log('🎵 Found music in "bytesBase64Encoded" field');
        } else if (prediction.audioContent) {
          musicBase64 = prediction.audioContent;
          console.log('🎵 Found music in "audioContent" field');
        } else if (prediction.audio) {
          musicBase64 = prediction.audio;
          console.log('🎵 Found music in "audio" field');
        } else if (prediction.data) {
          musicBase64 = prediction.data;
          console.log('🎵 Found music in "data" field');
        } else if (typeof prediction === 'string') {
          musicBase64 = prediction;
          console.log('🎵 Prediction is direct base64 string');
        }
        
        if (!musicBase64) {
          console.log('🎵 Full prediction object:', JSON.stringify(prediction, null, 2));
          throw new Error('No music data found in prediction. Keys: ' + Object.keys(prediction).join(', '));
        }
        
        // Lyria returns clean base64 WAV data
        const musicUrl = `data:audio/wav;base64,${musicBase64}`;
        
        console.log('✅ Successfully generated music with Lyria 2!');
        console.log('📏 Music data length:', musicBase64.length, 'characters');
        console.log('🎵 Duration: 30 seconds (Lyria standard)');
        console.log('🎵 Format: WAV 48kHz');
        console.log('🎵 ========================================');
        
        return {
          musicUrl: musicUrl,
          prompt: musicPrompt,
          mood: userMood,
          generatedWith: 'Lyria 2',
          duration: 30 // Lyria generates 30-second clips
        };
      } else {
        console.log('🎵 Full response data:', JSON.stringify(result.data, null, 2));
        throw new Error('No predictions in Lyria response or empty predictions array');
      }
      
    } catch (musicError) {
      console.log('⚠️ Lyria 2 music generation failed:', musicError.message);
      
      if (musicError.response) {
        console.log('📛 Lyria API Error Status:', musicError.response.status);
        console.log('📛 Lyria API Error Data:', JSON.stringify(musicError.response.data, null, 2));
        
        if (musicError.response.status === 429) {
          console.log('🚨 RATE LIMIT EXCEEDED for Lyria 2!');
          console.log('🚨 Lyria usage is priced at $0.06 per 30 seconds of output music');
          console.log('🚨 Check your quota at: https://console.cloud.google.com/iam-admin/quotas');
        } else if (musicError.response.status === 404) {
          console.log('🚨 Lyria 2 model not found!');
          console.log('🚨 Model name: lyria-002');
          console.log('🚨 Region:', process.env.GOOGLE_CLOUD_LOCATION || 'us-central1');
          console.log('🚨 Try checking if Lyria is available in your region');
          console.log('🚨 See: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation');
        } else if (musicError.response.status === 400) {
          console.log('🚨 BAD REQUEST - Check prompt format');
          console.log('🚨 Lyria only supports US English (en-us) text prompts');
        }
      }
      
      console.log('🔄 Music generation failed, session will continue without background music');
      console.log('🎵 ========================================');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error in music generation function:', error);
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
      
      // Check if we need to generate missing content
      const needsBackground = !session.sessionData.backgroundImage;
      const needsMusic = !session.sessionData.backgroundMusic;
      
      if (needsBackground || needsMusic) {
        console.log('🔄 Generating missing content...');
        console.log('  - Background needed:', needsBackground);
        console.log('  - Music needed:', needsMusic);
        
        // Generate background only if missing
        if (needsBackground) {
          const backgroundData = await generateSessionBackground(userContext, 'instant', firebaseUid);
          console.log('🎨 Background generated:', backgroundData?.type || 'None');
          
          if (backgroundData) {
            session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
            session.sessionData.backgroundPrompt = backgroundData.prompt;
            session.sessionData.backgroundType = backgroundData.type;
            if (backgroundData.generatedWith) {
              session.sessionData.generatedWith = backgroundData.generatedWith;
            }
          }
        } else {
          console.log('✅ Background already exists, skipping generation');
        }
        
        // Generate music only if missing
        if (needsMusic) {
          const userMood = await getUserMoodForBackground(firebaseUid);
          const musicData = await generateSessionMusic(userMood, 'instant', 30);
          
          if (musicData) {
            session.sessionData.backgroundMusic = musicData.musicUrl;
            session.sessionData.musicPrompt = musicData.prompt;
            session.sessionData.musicGeneratedWith = musicData.generatedWith;
            console.log('💾 Music generated for existing session');
          }
        } else {
          console.log('✅ Music already exists, skipping generation');
        }
        
        await session.save();
        console.log('💾 Session updated with generated content');
      } else {
        console.log('✅ Session already has background and music, returning existing content');
      }
      
      return res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          status: session.status,
          backgroundImage: session.sessionData.backgroundImage,
          backgroundPrompt: session.sessionData.backgroundPrompt,
          backgroundType: session.sessionData.backgroundType,
          backgroundMusic: session.sessionData.backgroundMusic,
          musicPrompt: session.sessionData.musicPrompt,
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

    // Generate personalized background based on user mood
    console.log('🎨 ========================================');
    console.log('🎨 CALLING generateSessionBackground...');
    const backgroundData = await generateSessionBackground(userContext, 'instant', firebaseUid);
    console.log('🎨 Background generated:', backgroundData?.type, '- Generated with:', backgroundData?.generatedWith || 'Gradient');
    console.log('🎨 ========================================');
    
    // Update session with background
    if (backgroundData) {
      // Store the generated image URL or mood for gradient fallback
      session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
      session.sessionData.backgroundPrompt = backgroundData.prompt;
      session.sessionData.backgroundType = backgroundData.type; // 'generated-image' or 'gradient'
      if (backgroundData.generatedWith) {
        session.sessionData.generatedWith = backgroundData.generatedWith;
      }
      
      console.log('💾 SAVED TO SESSION:');
      console.log('  - backgroundImage:', session.sessionData.backgroundImage ? 'Generated (' + session.sessionData.backgroundImage.substring(0, 20) + '...)' : 'None');
      console.log('  - backgroundType:', session.sessionData.backgroundType);
      console.log('  - generatedWith:', session.sessionData.generatedWith);
    }

    // Generate therapeutic music based on user mood
    const userMood = await getUserMoodForBackground(firebaseUid);
    console.log('🎵 ========================================');
    console.log('🎵 CALLING generateSessionMusic...');
    const musicData = await generateSessionMusic(userMood, 'instant', 30);
    console.log('🎵 MUSIC DATA RECEIVED:', musicData ? 'SUCCESS' : 'FAILED');
    console.log('🎵 ========================================');
    
    // Update session with music
    if (musicData) {
      session.sessionData.backgroundMusic = musicData.musicUrl;
      session.sessionData.musicPrompt = musicData.prompt;
      session.sessionData.musicGeneratedWith = musicData.generatedWith;
      
      console.log('💾 SAVED MUSIC TO SESSION:');
      console.log('  - backgroundMusic length:', session.sessionData.backgroundMusic?.length || 0);
      console.log('  - musicGeneratedWith:', session.sessionData.musicGeneratedWith);
    }

    // Get last session summary from MongoDB
    const lastSessionSummary = await getLastSessionSummary(firebaseUid);
    
    // Generate greeting with context
    const greeting = await generatePersonalizedGreeting(userContext, lastSessionSummary, 150);
    session.sessionData.greeting = greeting;
    console.log('✅ Generated personalized greeting');

    await session.save();
    console.log('✅ Session saved successfully:', session.sessionId);

    const responseData = {
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        backgroundImage: session.sessionData.backgroundImage,
        backgroundPrompt: session.sessionData.backgroundPrompt,
        backgroundType: session.sessionData.backgroundType,
        backgroundMusic: session.sessionData.backgroundMusic,
        musicPrompt: session.sessionData.musicPrompt,
        greeting: session.sessionData.greeting
      },
      message: 'Instant session started successfully'
    };
    
    res.json(responseData);

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
      // If already active, check if content exists
      if (session.status === 'active') {
        const hasBackground = !!session.sessionData.backgroundImage;
        const hasMusic = !!session.sessionData.backgroundMusic;
        
        if (hasBackground && hasMusic) {
          console.log('✅ Session already active with background and music, returning existing content');
          return res.json({
            success: true,
            session: {
              sessionId: session.sessionId,
              status: session.status,
              backgroundImage: session.sessionData.backgroundImage,
              backgroundPrompt: session.sessionData.backgroundPrompt,
              backgroundType: session.sessionData.backgroundType,
              backgroundMusic: session.sessionData.backgroundMusic,
              musicPrompt: session.sessionData.musicPrompt,
              greeting: session.sessionData.greeting
            },
            message: 'Session already active'
          });
        }
      } else {
        return res.status(400).json({ error: 'Session is not in scheduled status' });
      }
    }

    // Update session status to active
    session.status = 'active';
    
    // Check if we need to generate content
    const needsBackground = !session.sessionData.backgroundImage;
    const needsMusic = !session.sessionData.backgroundMusic;
    
    console.log('🔄 Generating content for scheduled session...');
    console.log('  - Background needed:', needsBackground);
    console.log('  - Music needed:', needsMusic);
    
    // Generate personalized background only if missing
    if (needsBackground) {
      const backgroundData = await generateSessionBackground(userContext, 'scheduled', session.firebaseUid);
      
      if (backgroundData) {
        // Store the generated image URL or mood for gradient fallback
        session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
        session.sessionData.backgroundPrompt = backgroundData.prompt;
        session.sessionData.backgroundType = backgroundData.type; // 'gemini-image' or 'gradient'
        if (backgroundData.generatedWith) {
          session.sessionData.generatedWith = backgroundData.generatedWith;
        }
      }
    } else {
      console.log('✅ Background already exists, skipping generation');
    }

    // Generate therapeutic music only if missing
    if (needsMusic) {
      const userMood = await getUserMoodForBackground(session.firebaseUid);
      const musicData = await generateSessionMusic(userMood, 'scheduled', 30);
      
      if (musicData) {
        session.sessionData.backgroundMusic = musicData.musicUrl;
        session.sessionData.musicPrompt = musicData.prompt;
        session.sessionData.musicGeneratedWith = musicData.generatedWith;
      }
    } else {
      console.log('✅ Music already exists, skipping generation');
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
        backgroundType: session.sessionData.backgroundType,
        backgroundMusic: session.sessionData.backgroundMusic,
        musicPrompt: session.sessionData.musicPrompt,
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
