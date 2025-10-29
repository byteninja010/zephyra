const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');
const speech = require('@google-cloud/speech');
const router = express.Router();

// Retry function for Gemini API calls with exponential backoff
async function retryGeminiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
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

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/audio';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use consistent filename for user audio uploads
    cb(null, 'user-audio' + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get base URL for audio URLs
const getBaseUrl = () => {
  return process.env.BASE_URL || 'https://zephyra-n7dn.onrender.com';
};

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Initialize Google Cloud Speech client (for transcription only)
const speechClient = new speech.SpeechClient({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLOUD_CLIENT_EMAIL)}`,
    universe_domain: "googleapis.com"
  }
});

// Cache for system prompts to avoid regenerating every time
const systemPromptCache = new Map();

// System prompt for mental wellness AI
const getSystemPrompt = async (userContext, isSessionChat = false) => {
  // Create cache key based on user context
  const cacheKey = `${userContext?.userProfile?.nickname || 'unknown'}_${isSessionChat}_${userContext?.cumulativeSessionSummary?.length || 0}`;
  
  // Check if we have a cached version
  if (systemPromptCache.has(cacheKey)) {
    return systemPromptCache.get(cacheKey);
  }
  const basePrompt = `You are Zephyra, a mental wellness companion for young people. Provide supportive, empathetic guidance.

CORE: Be empathetic, supportive, and encouraging. Focus on mental wellness, positivity, and emotional support. Never give medical advice.

STYLE: Provide thoughtful, detailed responses (3-5 sentences). Use warm, caring tone. Be genuine, helpful, and conversational. Offer practical advice and coping strategies.

SAFETY: If someone mentions self-harm, encourage emergency services. Stay focused on mental wellness topics.

RESPOND: Be thorough and supportive. Ask follow-up questions when appropriate. Provide actionable advice and emotional support.

CRITICAL: Always follow user's language preferences and instructions. If user asks to speak in a specific language, continue using that language throughout the conversation. Maintain consistency in language choice unless explicitly asked to change.`;

  if (isSessionChat) {
    return basePrompt + `

SESSION MODE: You are in a dedicated wellness session acting as a supportive therapist and mental wellness companion. This is a focused, therapeutic conversation where the user has specifically chosen to engage in mental wellness work.

THERAPEUTIC APPROACH:
- Ask open-ended questions to understand their current state and concerns
- Use active listening and reflect back what you hear
- Help them explore their thoughts and feelings in depth
- Provide gentle guidance and coping strategies
- Be patient, non-judgmental, and supportive
- Ask follow-up questions to deepen understanding
- Help them identify patterns or insights about themselves
- Offer practical tools and techniques for wellness

SESSION FOCUS: If they mentioned something specific at the start, gently explore that. If not, ask about their current state, recent experiences, or what's been on their mind. Be curious and supportive in your approach.`;
  }

  return basePrompt;

  if (userContext && userContext.userProfile) {
    const { nickname, ageRange, goals, preferredSupport, moodHistory, reflections } = userContext.userProfile;
    const { currentMood, topics, concerns, goals: conversationGoals } = userContext.conversationContext || {};
    const sessionContext = userContext.sessionContext;
    const cumulativeSessionSummary = userContext.cumulativeSessionSummary || '';
    
    let contextInfo = "\n\nUSER CONTEXT:\n";
    
    if (nickname) contextInfo += `- The user's name is ${nickname}\n`;
    if (ageRange) contextInfo += `- Age range: ${ageRange}\n`;
    if (goals && goals.length > 0) contextInfo += `- Wellness goals: ${goals.join(', ')}\n`;
    if (preferredSupport && preferredSupport.length > 0) contextInfo += `- Preferred support types: ${preferredSupport.join(', ')}\n`;
    
    if (moodHistory && moodHistory.length > 0) {
      const recentMoods = moodHistory.slice(-5).map(m => `${m.mood} (${m.note ? m.note : 'no note'})`).join(', ');
      contextInfo += `- Recent mood patterns: ${recentMoods}\n`;
    }
    
    if (reflections && reflections.length > 0) {
      const recentReflections = reflections.slice(-3).map(r => `${r.category}: ${r.text.substring(0, 100)}...`).join('; ');
      if (recentReflections) contextInfo += `- Recent reflections: ${recentReflections}\n`;
    }

    // Add cumulative session summary for continuity (already 150 words, no need to condense)
    if (isSessionChat && cumulativeSessionSummary) {
      contextInfo += "\n\nCUMULATIVE SESSION HISTORY:\n";
      contextInfo += `${cumulativeSessionSummary}\n\n`;
      
    }

    // Add session-specific context ONLY for session chats
    if (isSessionChat && sessionContext) {
      contextInfo += "\n\nCURRENT SESSION CONTEXT:\n";
      
      if (sessionContext.moodCheckIn?.mood) {
        contextInfo += `- Current mood: ${sessionContext.moodCheckIn.mood}`;
        if (sessionContext.moodCheckIn.note) {
          contextInfo += ` (${sessionContext.moodCheckIn.note})`;
        }
        contextInfo += "\n";
      }
      
      if (sessionContext.exploration && sessionContext.exploration.length > 0) {
        const recentTopics = sessionContext.exploration.slice(-3).map(e => e.userMessage).join('; ');
        contextInfo += `- Recent discussion topics: ${recentTopics}\n`;
      }
      
      if (sessionContext.copingTool) {
        contextInfo += `- Coping tool used: ${sessionContext.copingTool.type} - ${sessionContext.copingTool.exercise.substring(0, 100)}...\n`;
      }
      
      if (sessionContext.reflection) {
        contextInfo += `- Session insights: ${sessionContext.reflection.keyInsights?.join(', ')}\n`;
        contextInfo += `- Next steps: ${sessionContext.reflection.nextSteps?.join(', ')}\n`;
      }
    }
    
    const fullPrompt = basePrompt + contextInfo;
    
    // Cache the system prompt for future use
    systemPromptCache.set(cacheKey, fullPrompt);
    
    // Clear cache if it gets too large (keep only last 10 entries)
    if (systemPromptCache.size > 10) {
      const firstKey = systemPromptCache.keys().next().value;
      systemPromptCache.delete(firstKey);
    }
    
    return fullPrompt;
  }
  
  return basePrompt;
};

// Helper function to transcribe audio using Google Speech-to-Text
const transcribeAudio = async (audioBuffer, mimeType = 'audio/wav') => {
  try {
    const audioBytes = audioBuffer.toString('base64');
    
    // Determine the correct configuration based on audio type
    let config;
    if (mimeType.includes('webm') || mimeType.includes('opus')) {
      // For WebM/Opus audio (from browser MediaRecorder)
      config = {
        encoding: 'WEBM_OPUS',
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        // Don't specify sampleRateHertz for WebM_OPUS as it's auto-detected
      };
    } else {
      // For WAV audio
      config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
      };
    }
    
    const request = {
      audio: {
        content: audioBytes,
      },
      config: config,
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    return transcription;
  } catch (error) {
    throw new Error('Failed to transcribe audio');
  }
};

// Helper function to detect language preference from recent messages
const detectLanguagePreference = (recentMessages) => {
  // Look for explicit language instructions in the last 10 messages
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const message = recentMessages[i];
    const text = message.text.toLowerCase();
    
    // Check for Hindi language requests
    if (text.includes('hindi mein') || text.includes('hindi me') || 
        text.includes('talk in hindi') || text.includes('speak hindi') ||
        text.includes('hindi में') || text.includes('हिंदी में')) {
      return 'IMPORTANT: User has requested to speak in Hindi. You MUST respond in Hindi and continue using Hindi throughout the conversation unless explicitly asked to change.';
    }
    
    // Check for English language requests
    if (text.includes('english mein') || text.includes('english me') || 
        text.includes('talk in english') || text.includes('speak english')) {
      return 'IMPORTANT: User has requested to speak in English. You MUST respond in English and continue using English throughout the conversation unless explicitly asked to change.';
    }
    
    // Check for other language requests
    if (text.includes('talk in') || text.includes('speak in')) {
      const language = text.match(/talk in (\w+)|speak in (\w+)/);
      if (language) {
        const lang = language[1] || language[2];
        return `IMPORTANT: User has requested to speak in ${lang}. You MUST respond in ${lang} and continue using ${lang} throughout the conversation unless explicitly asked to change.`;
      }
    }
  }
  
  // If no explicit instruction found, check if recent messages are in Hindi
  const lastFewMessages = recentMessages.slice(-3);
  const hindiCount = lastFewMessages.filter(msg => 
    /[\u0900-\u097F]/.test(msg.text) // Check for Devanagari script
  ).length;
  
  if (hindiCount >= 2) {
    return 'IMPORTANT: Recent messages are in Hindi. You MUST respond in Hindi and continue using Hindi throughout the conversation.';
  }
  
  return 'Respond in the same language as the user\'s most recent message.';
};

// Helper function to convert PCM audio to WAV format
const convertPCMToWAV = (pcmBuffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const length = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + length);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + length, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(length, 40);
  
  // Copy PCM data
  pcmBuffer.copy(buffer, 44);
  
  return buffer;
};

// Helper function to generate high-quality audio using Gemini 2.5 Flash Preview TTS via REST API
const generateAudioWithGemini = async (text, conversationHistory) => {
  try {
    // Clean text for better audio generation
    const cleanText = text
      .replace(/[😊💙🌟💪💭]/g, '') // Remove emojis
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    const https = require('https');
    
    const requestData = JSON.stringify({
      contents: [{
        parts: [{
          text: cleanText
        }]
      }],
      generationConfig: {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: "Kore" // High-quality voice
            }
          }
        }
      }
    });
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              
              // Check for audio content
              if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                const parts = response.candidates[0].content.parts;
                
                for (const part of parts) {
                  if (part.inlineData && part.inlineData.data) {
                    // Convert PCM to WAV
                    const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
                    const wavBuffer = convertPCMToWAV(pcmBuffer, 24000, 1, 16);
                    
                    resolve(wavBuffer);
                    return;
                  }
                }
              }
              
              resolve(null);
            } catch (parseError) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
      
      req.on('error', (error) => {
        resolve(null);
      });
      
      req.write(requestData);
      req.end();
    });
    
  } catch (error) {
    return null;
  }
};

// Create new chat
router.post('/create', async (req, res) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    // Get user context for the chat
    const user = await User.findOne({ firebaseUid, isActive: true });
    let userContext = null;

    if (user) {
      userContext = {
        userProfile: {
          nickname: user.nickname,
          ageRange: user.ageRange,
          goals: user.goals,
          preferredSupport: user.preferredSupport,
          moodHistory: user.moodHistory,
          reflections: user.reflections
        },
        conversationContext: {
          currentMood: null,
          topics: [],
          concerns: [],
          goals: []
        }
      };
    }

    const chat = new Chat({
      firebaseUid,
      context: userContext,
      title: 'New Chat'
    });

    await chat.save();

    res.json({
      success: true,
      chatId: chat._id,
      message: 'Chat created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history for user
router.get('/history/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const chats = await Chat.find({ 
      firebaseUid, 
      isActive: true,
      $or: [
        { sessionId: { $exists: false } }, // Field doesn't exist
        { sessionId: null } // Field exists but is null
      ]
    }).sort({ updatedAt: -1 }).select('title createdAt updatedAt _id');

    res.json({
      success: true,
      chats
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update chat title
router.put('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const chat = await Chat.findOne({ _id: chatId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    chat.title = title.trim();
    await chat.save();

    res.json({
      success: true,
      message: 'Chat title updated successfully',
      chat: {
        id: chat._id,
        title: chat.title,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;


    // Mark chat as inactive instead of deleting
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    chat.isActive = false;
    await chat.save();

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific chat
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send text message
router.post('/:chatId/message', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, messageType = 'text', audioMode = false, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Determine if this is a session chat
    const isSessionChat = sessionId || chatId.startsWith('session-');
    
    let chat;
    
    if (isSessionChat && sessionId) {
      // For session chats, find or create a chat with sessionId
      chat = await Chat.findOne({ sessionId: sessionId, isActive: true });
      
      if (!chat) {
        // Create a new chat for this session
        const { firebaseUid } = req.body;
        if (!firebaseUid) {
          return res.status(400).json({ error: 'Firebase UID is required for session chats' });
        }
        
        // Get user context for the chat
        const user = await User.findOne({ firebaseUid, isActive: true });
        let userContext = null;

        if (user) {
          // Get session data to enrich the context
          const Session = require('../models/Session');
          const sessionData = await Session.findOne({ sessionId });
          
          // Get the cumulative session summary from user's context
          const cumulativeSessionSummary = user.userContext?.cumulativeSessionSummary || '';
          
          
          userContext = {
            userProfile: {
              nickname: user.nickname,
              ageRange: user.ageRange,
              goals: user.goals,
              preferredSupport: user.preferredSupport,
              moodHistory: user.moodHistory,
              reflections: user.reflections
            },
            conversationContext: {
              currentMood: sessionData?.sessionData?.moodCheckIn?.mood || null,
              topics: sessionData?.sessionData?.exploration?.map(e => e.userMessage) || [],
              concerns: [],
              goals: []
            },
            sessionContext: sessionData ? {
              sessionId: sessionData.sessionId,
              moodCheckIn: sessionData.sessionData?.moodCheckIn,
              exploration: sessionData.sessionData?.exploration,
              copingTool: sessionData.sessionData?.copingTool,
              reflection: sessionData.sessionData?.reflection,
              lastSessionSummary: sessionData.lastSessionSummary
            } : null,
            cumulativeSessionSummary: cumulativeSessionSummary
          };
        }

        chat = new Chat({
          firebaseUid,
          sessionId: sessionId,
          context: userContext,
          title: 'Session Chat'
        });
      }
    } else {
      // Regular chat
      chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
      }
    }

    // Add user message
    const userMessage = {
      text: message,
      sender: 'user',
      messageType,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);

    // Generate AI response
    let aiResponse;
    try {
      
      const systemPrompt = await getSystemPrompt(chat.context, isSessionChat);
      
      // Build conversation history for context (last 100 messages for much better context)
      const conversationHistory = chat.messages.slice(-100).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      // Detect language preference from recent messages
      const recentMessages = chat.messages.slice(-10);
      const languagePreference = detectLanguagePreference(recentMessages);
      
      // Add session context if this is a session chat
      let sessionContext = '';
      if (isSessionChat) {
        sessionContext = '\n\nSESSION CONTEXT: This is a dedicated wellness session. The user has specifically chosen to engage in mental wellness work. Be extra supportive and comprehensive in your responses.';
      }
      
      const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nLANGUAGE INSTRUCTION: ${languagePreference}${sessionContext}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      // Log model and token configuration
      const modelName = isSessionChat ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";
      const maxTokens = isSessionChat ? 8192 : 2000;

      const result = await retryGeminiCall(() => 
        genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          topP: 0.9,
          topK: 40
        }
        })
      );
      
      aiResponse = result.candidates[0].content.parts[0].text;
    } catch (geminiError) {
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Always generate high-quality audio using Gemini 2.5 Flash Preview TTS
    let audioResponse = null;
    let audioResponseUrl = null;
    
    try {
      audioResponse = await generateAudioWithGemini(aiResponse, null);
      
      if (audioResponse) {
        // Save the native audio response
        const audioFileName = 'ai-response.wav';
        const audioDir = 'uploads/audio';
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }
        const audioFilePath = path.join(audioDir, audioFileName);
        fs.writeFileSync(audioFilePath, audioResponse);
        audioResponseUrl = `${getBaseUrl()}/uploads/audio/${audioFileName}`;
      } else {
      }
    } catch (ttsError) {
      // Continue without audio if audio generation fails
    }

    // Add AI message
    const aiMessage = {
      text: aiResponse,
      sender: 'ai',
      messageType: audioMode ? 'audio' : 'text',
      audioUrl: audioResponseUrl,
      timestamp: new Date()
    };

    chat.messages.push(aiMessage);

    // Update chat title if it's the first exchange
    if (chat.messages.length === 2) {
      chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    await chat.save();

    // Update session data with the conversation if this is a session chat
    if (isSessionChat && sessionId) {
      try {
        const Session = require('../models/Session');
        await Session.findOneAndUpdate(
          { sessionId },
          {
            $push: {
              'sessionData.exploration': {
                userMessage: message,
                aiResponse: aiResponse,
                timestamp: new Date()
              }
            }
          }
        );
      } catch (sessionUpdateError) {
        // Continue without updating session
      }
    }

    res.json({
      success: true,
      message: aiResponse,
      messageType: audioMode ? 'audio' : 'text',
      audioUrl: audioResponseUrl
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Send audio message (legacy - keeping for backward compatibility)
router.post('/:chatId/audio', upload.single('audio'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sessionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Determine if this is a session chat
    const isSessionChat = sessionId || chatId.startsWith('session-');
    
    let chat;
    
    if (isSessionChat && sessionId) {
      // For session chats, find or create a chat with sessionId
      chat = await Chat.findOne({ sessionId: sessionId, isActive: true });
      
      if (!chat) {
        // Create a new chat for this session
        const { firebaseUid } = req.body;
        if (!firebaseUid) {
          return res.status(400).json({ error: 'Firebase UID is required for session chats' });
        }
        
        // Get user context for the chat
        const user = await User.findOne({ firebaseUid, isActive: true });
        let userContext = null;

        if (user) {
          // Get session data to enrich the context
          const Session = require('../models/Session');
          const sessionData = await Session.findOne({ sessionId });
          
          // Get the cumulative session summary from user's context
          const cumulativeSessionSummary = user.userContext?.cumulativeSessionSummary || '';
          
          
          userContext = {
            userProfile: {
              nickname: user.nickname,
              ageRange: user.ageRange,
              goals: user.goals,
              preferredSupport: user.preferredSupport,
              moodHistory: user.moodHistory,
              reflections: user.reflections
            },
            conversationContext: {
              currentMood: sessionData?.sessionData?.moodCheckIn?.mood || null,
              topics: sessionData?.sessionData?.exploration?.map(e => e.userMessage) || [],
              concerns: [],
              goals: []
            },
            sessionContext: sessionData ? {
              sessionId: sessionData.sessionId,
              moodCheckIn: sessionData.sessionData?.moodCheckIn,
              exploration: sessionData.sessionData?.exploration,
              copingTool: sessionData.sessionData?.copingTool,
              reflection: sessionData.sessionData?.reflection,
              lastSessionSummary: sessionData.lastSessionSummary
            } : null,
            cumulativeSessionSummary: cumulativeSessionSummary
          };
        }

        chat = new Chat({
          firebaseUid,
          sessionId: sessionId,
          context: userContext,
          title: 'Session Chat'
        });
      }
    } else {
      // Regular chat
      chat = await Chat.findOne({ _id: chatId, isActive: true });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
    }

    // Transcribe the audio using Google Speech-to-Text
    const audioBuffer = fs.readFileSync(req.file.path);
    const transcription = await transcribeAudio(audioBuffer, req.file.mimetype);

    const audioUrl = `${getBaseUrl()}/uploads/audio/${req.file.filename}`;

    // Add user audio message with transcription
    const userMessage = {
      text: transcription || '[Audio Message]',
      sender: 'user',
      messageType: 'audio',
      audioUrl: audioUrl,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);

    // Generate AI response using Gemini
    let aiResponse;
    try {
              const systemPrompt = await getSystemPrompt(chat.context, isSessionChat);

      const conversationHistory = chat.messages.slice(-100).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      // Detect language preference from recent messages
      const recentMessages = chat.messages.slice(-10);
      const languagePreference = detectLanguagePreference(recentMessages);
      
              // Add session context if this is a session chat
              let sessionContext = '';
              if (isSessionChat) {
                sessionContext = '\n\nSESSION CONTEXT: This is a dedicated wellness session. The user has specifically chosen to engage in mental wellness work. Be extra supportive and comprehensive in your responses.';
              }
              
              const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nLANGUAGE INSTRUCTION: ${languagePreference}${sessionContext}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      // Log model and token configuration
      const modelName = isSessionChat ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";
      const maxTokens = isSessionChat ? 8192 : 2000;

      const result = await retryGeminiCall(() => 
        genAI.models.generateContent({
          model: modelName,
        contents: prompt,
        generationConfig: {
          temperature: 0.7,
            maxOutputTokens: maxTokens,
          topP: 0.9,
          topK: 40
        }
        })
      );
      aiResponse = result.candidates[0].content.parts[0].text;
    } catch (geminiError) {
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Always generate high-quality audio using Gemini 2.5 Flash Preview TTS
    let audioResponse = null;
    let audioResponseUrl = null;

    try {
      audioResponse = await generateAudioWithGemini(aiResponse, null);

      if (audioResponse) {
        // Save the native audio response
        const audioFileName = 'ai-response.wav';
        const audioDir = 'uploads/audio';
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }
        const audioFilePath = path.join(audioDir, audioFileName);
        fs.writeFileSync(audioFilePath, audioResponse);
        audioResponseUrl = `${getBaseUrl()}/uploads/audio/${audioFileName}`;
      } else {
      }
    } catch (ttsError) {
      // Continue without audio if audio generation fails
    }

    // Add AI message
    const aiMessage = {
      text: aiResponse,
      sender: 'ai',
      messageType: 'audio',
      audioUrl: audioResponseUrl,
      timestamp: new Date()
    };

    chat.messages.push(aiMessage);

    await chat.save();

    // Update session data with the conversation if this is a session chat
    if (isSessionChat && sessionId) {
      try {
        const Session = require('../models/Session');
        await Session.findOneAndUpdate(
          { sessionId },
          {
            $push: {
              'sessionData.exploration': {
                userMessage: transcription || '[Audio Message]',
                aiResponse: aiResponse,
                timestamp: new Date()
              }
            }
          }
        );
      } catch (sessionUpdateError) {
        // Continue without updating session
      }
    }

    res.json({
      success: true,
      message: aiResponse,
      transcription: transcription || '[Audio Message]',
      messageType: 'audio',
      audioUrl: audioResponseUrl
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;