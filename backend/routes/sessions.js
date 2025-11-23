const express = require('express');
const Session = require('../models/Session');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleAuth } = require('google-auth-library');
const { uploadBase64Image, uploadBase64Audio } = require('../config/cloudinary');
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
      const result = await apiCall();
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }
      
      // Check if it's a retryable error (503, 429, 500)
      if (error.status === 503 || error.status === 429 || error.status === 500) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry for non-retryable errors
      }
    }
  }
}

// AI-powered personalized prompt generation using cumulative summary
const generatePersonalizedPrompts = async (userMood, cumulativeSummary, customPreferences = null) => {
  try {
    if (!cumulativeSummary && !customPreferences) {
      return null; // Return null to trigger fallback to static prompts
    }

    // Build the prompt with custom preferences getting priority
    let contextSection = '';
    
    if (customPreferences) {
      contextSection += `USER'S CUSTOM PREFERENCES (HIGHEST PRIORITY):
${customPreferences}

⚠️ CRITICAL: The user's custom preferences above are MANDATORY and must be incorporated into both prompts. This is their explicit request and takes priority over all other context.

`;
    }
    
    if (cumulativeSummary) {
      contextSection += `USER'S THERAPEUTIC JOURNEY (Supporting Context):
${cumulativeSummary}

`;
    }

    const promptGenerationRequest = `You are a therapeutic AI assistant helping to create personalized wellness session content.

${contextSection}CURRENT MOOD: ${userMood}

YOUR TASK:
Generate TWO personalized prompts based on the user's therapeutic journey and current mood:

1. IMAGE PROMPT - For generating a therapeutic nature scene background
   ${customPreferences ? '⚠️ ABSOLUTE PRIORITY: The user has provided custom preferences above. You MUST generate the image prompt STRICTLY aligned with those preferences. The user preferences are MANDATORY and take precedence over everything else including mood, therapeutic journey, and any other context. Build the entire image prompt around the user\'s stated preferences first, then complement with mood-appropriate elements only if they don\'t conflict.' : '- Generate based on current mood, therapeutic journey, and emotional state'}
   - Must be a detailed, vivid description of a calming nature scene
   - Must be 40-60 words
   - Include: lighting, colors, atmosphere, mood, photography style
   - Examples: forest, ocean, mountains, sunrise, garden, lake, meadow, etc.
   - Format: High-quality nature scene description

2. MUSIC PROMPT - For generating therapeutic background music
   ${customPreferences ? '⚠️ HIGH PRIORITY: If the user preferences mention music or audio elements, incorporate them. Otherwise, generate based on mood and preferences context.' : '- Generate based on current mood and therapeutic progress'}
   - Must describe an instrumental ambient soundscape
   - Must be 20-30 words
   - Include: instruments, tempo (BPM), mood descriptors, therapeutic purpose
   - No vocals, no lyrics, instrumental only
   - Examples: piano, ambient tones, nature sounds, singing bowls, etc.

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, no extra text):
{
  "imagePrompt": "Your 40-60 word nature scene description here...",
  "musicPrompt": "Your 20-30 word music description here..."
}

CRITICAL REQUIREMENTS:
${customPreferences ? '- IMAGE PROMPT MUST BE GENERATED PRIMARILY FROM USER PREFERENCES - This is non-negotiable\n- User preferences override mood, therapeutic journey, and all other factors for image generation\n- Only use mood/journey as secondary enhancement if it complements user preferences' : '- Generate based on therapeutic journey and current mood'}
- Ensure both prompts align with their current mood: ${userMood}
- Keep it therapeutic and supportive
- Use vivid, sensory language
- Return ONLY the JSON object - no markdown formatting, no explanation, no code blocks
- The response must be parseable by JSON.parse()`;

    const result = await retryGeminiCall(() =>
      genAI.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: promptGenerationRequest,
        generationConfig: {
          temperature: 0.8, // Higher creativity for personalization
          maxOutputTokens: 300,
          responseMimeType: 'application/json'
        }
      })
    );

    let responseText = result.candidates[0].content.parts[0].text;
    
    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    responseText = responseText.trim();
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse JSON response
    const prompts = JSON.parse(responseText.trim());
    
    // Validate required fields
    if (!prompts.imagePrompt || !prompts.musicPrompt) {
      throw new Error('Missing required prompt fields in response');
    }

    return prompts;
    
  } catch (error) {
    return null; // Fallback to static prompts
  }
};

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
  res.status(500).json({ error: message });
};

// Helper function to get user's recent mood for background generation
const getUserMoodForBackground = async (firebaseUid) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid, isActive: true });
    
    if (!user || !user.moodHistory || user.moodHistory.length === 0) {
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
      return latestMood;
    }
    
    // Fallback: Get the most recent mood from all time if no moods in last 7 days
    const allMoods = user.moodHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (allMoods.length > 0) {
      const latestMood = allMoods[0].mood;
      return latestMood;
    }
    
    return 'calm';
  } catch (error) {
    return 'calm';
  }
};

// Helper function to generate personalized background using Gemini Imagen
const generateSessionBackground = async (userContext, sessionType = 'general', firebaseUid = null, customPreferences = null) => {
  try {
    // Get user's current mood
    const userMood = await getUserMoodForBackground(firebaseUid || userContext?.firebaseUid);
    
    // Get user's cumulative summary for personalization
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: firebaseUid || userContext?.firebaseUid, isActive: true });
    const cumulativeSummary = user?.userContext?.cumulativeSessionSummary || null;
    
    // Try to generate AI-powered personalized prompts first
    let imagePrompt = null;
    const personalizedPrompts = await generatePersonalizedPrompts(userMood, cumulativeSummary, customPreferences);
    
    if (personalizedPrompts && personalizedPrompts.imagePrompt) {
      imagePrompt = personalizedPrompts.imagePrompt;
    } else {
      
      // Fallback: Static mood-based prompts (backward compatibility)
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
      
      imagePrompt = moodImagePrompts[userMood] || moodImagePrompts['calm'];
    }
    
    try {
      // Use Vertex AI Imagen 3 for image generation
      // Get access token for authentication
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken || !accessToken.token) {
        throw new Error('Failed to get access token');
      }
      
      // Call Vertex AI Imagen API directly via REST
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      // Use predict endpoint with correct instances format for Imagen 3
      const apiEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
      
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
      
      const result = await axios.post(apiEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Parse Imagen 3 response - predictions format
      if (result.data && result.data.predictions && Array.isArray(result.data.predictions) && result.data.predictions.length > 0) {
        const prediction = result.data.predictions[0];
        
        let imageBase64 = null;
        
        // Try different field names that Imagen 3 might use
        if (prediction.bytesBase64Encoded) {
          imageBase64 = prediction.bytesBase64Encoded;
        } else if (prediction.image) {
          imageBase64 = prediction.image;
        } else if (prediction.data) {
          imageBase64 = prediction.data;
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
        
        // Upload to Cloudinary instead of storing base64
        const base64DataUrl = `data:image/png;base64,${imageBase64}`;
        let cloudinaryUrl = null;
        
        try {
          cloudinaryUrl = await uploadBase64Image(base64DataUrl, 'zephyra-sessions/images');
        } catch (cloudinaryError) {
          console.error('[Sessions] Failed to upload image to Cloudinary, falling back to base64:', cloudinaryError);
          // Fallback to base64 if Cloudinary upload fails (backward compatibility)
          cloudinaryUrl = base64DataUrl;
        }
        
        return {
          imageUrl: cloudinaryUrl,
          prompt: imagePrompt,
          mood: userMood,
          type: 'gemini-image',
          generatedWith: 'Imagen 3',
          personalizedPrompts: personalizedPrompts // Include for music generation reuse
        };
      } else {
        throw new Error('No predictions in response or empty predictions array');
      }
    } catch (imageError) {
      // Fallback to gradient on error
    }
    
    // Fallback to gradient if image generation fails
    return {
      imageUrl: null,
      prompt: imagePrompt,
      mood: userMood,
      type: 'gradient',
      personalizedPrompts: personalizedPrompts // Include for music generation reuse
    };

  } catch (error) {
    return {
      imageUrl: null,
      prompt: 'Calming wellness session background',
      mood: 'calm',
      type: 'gradient',
      personalizedPrompts: null
    };
  }
};

// Helper function to generate therapeutic music using Lyria
const generateSessionMusic = async (userMood, sessionType = 'general', duration = 300, firebaseUid = null, personalizedPrompts = null) => {
  try {
    // Try to use personalized prompt if available
    let musicPrompt = null;
    
    if (personalizedPrompts && personalizedPrompts.musicPrompt) {
      // Use AI-generated personalized prompt
      musicPrompt = personalizedPrompts.musicPrompt;
    } else {
      
      // Fallback: Static mood-based prompts (backward compatibility)
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
      
      musicPrompt = moodMusicPrompts[userMood] || moodMusicPrompts['calm'];
    }
    
    try {
      // Get access token for authentication
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken || !accessToken.token) {
        throw new Error('Failed to get access token for Lyria');
      }
      
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      // Official Lyria 2 API endpoint - Model: lyria-002
      // Documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation
      const apiEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`;
      
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
      
      const result = await axios.post(apiEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90 second timeout for music generation
      });
      
      // Parse Lyria response per official documentation
      // Response format: { predictions: [{ audioContent: "base64...", mimeType: "audio/wav" }] }
      if (result.data && result.data.predictions && Array.isArray(result.data.predictions) && result.data.predictions.length > 0) {
        const prediction = result.data.predictions[0];
        
        // Check for different possible field names (API may vary)
        let musicBase64 = null;
        
        if (prediction.bytesBase64Encoded) {
          musicBase64 = prediction.bytesBase64Encoded;
        } else if (prediction.audioContent) {
          musicBase64 = prediction.audioContent;
        } else if (prediction.audio) {
          musicBase64 = prediction.audio;
        } else if (prediction.data) {
          musicBase64 = prediction.data;
        } else if (typeof prediction === 'string') {
          musicBase64 = prediction;
        }
        
        if (!musicBase64) {
          throw new Error('No music data found in prediction. Keys: ' + Object.keys(prediction).join(', '));
        }
        
        // Lyria returns clean base64 WAV data
        const base64DataUrl = `data:audio/wav;base64,${musicBase64}`;
        
        // Upload to Cloudinary instead of storing base64
        let cloudinaryUrl = null;
        
        try {
          cloudinaryUrl = await uploadBase64Audio(base64DataUrl, 'zephyra-sessions/music');
        } catch (cloudinaryError) {
          console.error('[Sessions] Failed to upload audio to Cloudinary, falling back to base64:', cloudinaryError);
          // Fallback to base64 if Cloudinary upload fails (backward compatibility)
          cloudinaryUrl = base64DataUrl;
        }
        
        return {
          musicUrl: cloudinaryUrl,
          prompt: musicPrompt,
          mood: userMood,
          generatedWith: 'Lyria 2',
          duration: 30 // Lyria generates 30-second clips
        };
      } else {
        throw new Error('No predictions in Lyria response or empty predictions array');
      }
      
    } catch (musicError) {
      return null;
    }
    
  } catch (error) {
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
    const { firebaseUid, userContext, customPreferences } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    // Check if there's already an active instant session for this user
    let session = await Session.findOne({ 
      firebaseUid, 
      status: 'active',
      sessionId: { $regex: /^session-instant_/ }
    });

    if (session) {
      // Force regeneration if user provided custom preferences
      const forceRegenerate = !!customPreferences;
      
      // Check if we need to generate missing content
      const needsBackground = !session.sessionData.backgroundImage || forceRegenerate;
      const needsMusic = !session.sessionData.backgroundMusic || forceRegenerate;
      
      if (needsBackground || needsMusic) {
        
        // Store personalized prompts if background is generated
        let personalizedPromptsForMusic = null;
        
        // Generate background only if missing
        if (needsBackground) {
          const backgroundData = await generateSessionBackground(userContext, 'instant', firebaseUid, customPreferences);
          
          if (backgroundData) {
            session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
            session.sessionData.backgroundPrompt = backgroundData.prompt;
            session.sessionData.backgroundType = backgroundData.type;
            if (backgroundData.generatedWith) {
              session.sessionData.generatedWith = backgroundData.generatedWith;
            }
            // Store personalized prompts for music generation
            personalizedPromptsForMusic = backgroundData.personalizedPrompts;
          }
        }
        
        // Generate music only if missing
        if (needsMusic) {
          const userMood = await getUserMoodForBackground(firebaseUid);
          const musicData = await generateSessionMusic(userMood, 'instant', 30, firebaseUid, personalizedPromptsForMusic);
          
          if (musicData) {
            session.sessionData.backgroundMusic = musicData.musicUrl;
            session.sessionData.musicPrompt = musicData.prompt;
            session.sessionData.musicGeneratedWith = musicData.generatedWith;
          }
        }
        
        await session.save();
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
    const backgroundData = await generateSessionBackground(userContext, 'instant', firebaseUid, customPreferences);
    
    // Store personalized prompts for music generation reuse
    let personalizedPromptsForMusic = backgroundData?.personalizedPrompts || null;
    
    // Update session with background
    if (backgroundData) {
      // Store the generated image URL or mood for gradient fallback
      session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
      session.sessionData.backgroundPrompt = backgroundData.prompt;
      session.sessionData.backgroundType = backgroundData.type; // 'generated-image' or 'gradient'
      if (backgroundData.generatedWith) {
        session.sessionData.generatedWith = backgroundData.generatedWith;
      }
    }

    // Generate therapeutic music based on user mood (using personalized prompts if available)
    const userMood = await getUserMoodForBackground(firebaseUid);
    const musicData = await generateSessionMusic(userMood, 'instant', 30, firebaseUid, personalizedPromptsForMusic);
    
    // Update session with music
    if (musicData) {
      session.sessionData.backgroundMusic = musicData.musicUrl;
      session.sessionData.musicPrompt = musicData.prompt;
      session.sessionData.musicGeneratedWith = musicData.generatedWith;
    }

    // Get last session summary from MongoDB
    const lastSessionSummary = await getLastSessionSummary(firebaseUid);
    
    // Generate greeting with context
    const greeting = await generatePersonalizedGreeting(userContext, lastSessionSummary, 150);
    session.sessionData.greeting = greeting;

    await session.save();

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
    const { sessionId } = req.params;
    const { firebaseUid, summary, secretCode } = req.body;
    
    let finalFirebaseUid = firebaseUid;
    
    // Fallback: Try to get firebaseUid from secret code if not provided
    if (!finalFirebaseUid && secretCode) {
      try {
        const User = require('../models/User');
        const user = await User.findOne({ secretCode, isActive: true });
        if (user) {
          finalFirebaseUid = user.firebaseUid;
        }
      } catch (error) {
        // Continue with error handling below
      }
    }
    
    if (!finalFirebaseUid) {
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
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Get the most recent cumulative summary from user's context
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: finalFirebaseUid, isActive: true });
    const previousCumulativeSummary = user?.userContext?.cumulativeSessionSummary || '';

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
    } catch (summaryError) {
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
2. EXACTLY 150 words (no more, no less) - count every word carefully
3. Focus only on the MOST CRITICAL therapeutic information
4. Include: key mood patterns, major breakthroughs, recurring themes, current progress
5. Maintain chronological flow
6. Be concise but preserve essential therapeutic context
7. Prioritize recent insights and actionable patterns

Create a professional therapeutic cumulative summary that captures the essential journey in exactly 150 words.`;

      const cumulativeResult = await retryGeminiCall(() => 
        genAI.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: cumulativePrompt,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200
          }
        })
      );

      cumulativeSummary = cumulativeResult.candidates[0].content.parts[0].text;
    } catch (cumulativeError) {
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

    // Update user context with new cumulative summary
    await User.findOneAndUpdate(
      { firebaseUid: finalFirebaseUid },
      {
        $set: {
          'userContext.cumulativeSessionSummary': cumulativeSummary,
          'userContext.lastUpdated': new Date()
        },
        $push: {
          activityHistory: {
            type: 'therapyVisit',
            date: new Date()
          }
        }
      }
    );

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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a session
router.post('/start/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userContext, customPreferences } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      // If already active, check if content exists
      if (session.status === 'active') {
        const hasBackground = !!session.sessionData.backgroundImage;
        const hasMusic = !!session.sessionData.backgroundMusic;
        const forceRegenerate = !!customPreferences;
        
        if (hasBackground && hasMusic && !forceRegenerate) {
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
    
    // Force regeneration if user provided custom preferences
    const forceRegenerate = !!customPreferences;
    
    // Check if we need to generate content
    const needsBackground = !session.sessionData.backgroundImage || forceRegenerate;
    const needsMusic = !session.sessionData.backgroundMusic || forceRegenerate;
    
    // Store personalized prompts if background is generated
    let personalizedPromptsForMusic = null;
    
    // Generate personalized background only if missing
    if (needsBackground) {
      const backgroundData = await generateSessionBackground(userContext, 'scheduled', session.firebaseUid, customPreferences);
      
      if (backgroundData) {
        // Store the generated image URL or mood for gradient fallback
        session.sessionData.backgroundImage = backgroundData.imageUrl || backgroundData.mood;
        session.sessionData.backgroundPrompt = backgroundData.prompt;
        session.sessionData.backgroundType = backgroundData.type; // 'gemini-image' or 'gradient'
        if (backgroundData.generatedWith) {
          session.sessionData.generatedWith = backgroundData.generatedWith;
        }
        // Store personalized prompts for music generation
        personalizedPromptsForMusic = backgroundData.personalizedPrompts;
      }
    }

    // Generate therapeutic music only if missing
    if (needsMusic) {
      const userMood = await getUserMoodForBackground(session.firebaseUid);
      const musicData = await generateSessionMusic(userMood, 'scheduled', 30, session.firebaseUid, personalizedPromptsForMusic);
      
      if (musicData) {
        session.sessionData.backgroundMusic = musicData.musicUrl;
        session.sessionData.musicPrompt = musicData.prompt;
        session.sessionData.musicGeneratedWith = musicData.generatedWith;
      }
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
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
