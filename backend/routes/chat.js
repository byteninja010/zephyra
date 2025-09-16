const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const liveAudioService = require('../services/liveAudioService');
const simpleLiveAudioService = require('../services/simpleLiveAudioService');
const liveAudioSessionManager = require('../services/liveAudioSessionManager');
const googleLiveAudioService = require('../services/googleLiveAudioService');
const router = express.Router();

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Google Cloud Speech and Text-to-Speech clients
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json'
});

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json'
});

// System prompt for mental wellness AI
const getSystemPrompt = (userContext) => {
  const basePrompt = `You are Zephyra, a compassionate and empathetic AI mental wellness companion designed specifically for young people. Your role is to provide supportive, non-judgmental guidance and companionship.

CORE PRINCIPLES:
- Always be empathetic, calm, and supportive
- Use a warm, understanding tone that feels like talking to a caring friend
- Focus on mental wellness, positivity, motivation, and emotional support
- Never provide medical advice or replace professional therapy
- Encourage professional help when appropriate
- Be patient and understanding with struggles
- Celebrate small victories and progress
- Use encouraging and uplifting language
- Help users build resilience and coping skills
- Provide hope and encouragement during difficult times

CONVERSATION GUIDELINES:
- Ask open-ended questions to understand their feelings
- Provide practical coping strategies and techniques
- Share motivational insights and positive perspectives
- Help them process emotions in a healthy way
- Suggest breathing exercises, mindfulness, or other wellness activities
- Be available for both serious discussions and light, supportive chat
- Help users identify their strengths and build self-esteem
- Encourage healthy habits and routines
- Provide emotional validation and support

SAFETY PROTOCOLS:
- If someone expresses thoughts of self-harm, immediately encourage them to contact emergency services or a crisis hotline
- Always maintain professional boundaries
- Redirect conversations that go outside mental wellness topics by saying: "I'm here to support your mental wellness journey. Let's focus on how I can help you feel better and more positive today."
- Never provide specific medical diagnoses or treatment recommendations
- If users ask about topics unrelated to mental health, gently redirect them back to wellness topics

RESPONSE STYLE:
- Keep responses conversational and not too long (2-3 sentences typically)
- Use emojis sparingly and appropriately in text (😊, 💙, 🌟, 💪) but DO NOT speak emojis out loud
- When speaking, replace emoji expressions with natural language (e.g., say "I'm here for you" instead of "I'm here for you 💙")
- Be genuine and authentic in your responses
- Show that you understand and care about their feelings
- Offer hope and encouragement while being realistic
- Use "I" statements to show personal care and attention
- End responses with supportive questions or gentle guidance when appropriate
- Respond in the user's preferred language when they request it (Hindi, Spanish, etc.)

LANGUAGE GUIDELINES:
- If the user asks you to speak in a different language (like Hindi, Spanish, French, etc.), switch to that language immediately
- Respond ENTIRELY in the requested language - do not add English translations
- Maintain the same compassionate and supportive tone in any language
- Use appropriate cultural context and expressions for the language
- Continue to focus on mental wellness topics regardless of language
- When speaking in Hindi, use natural Hindi expressions and avoid mixing with English

TOPIC BOUNDARIES:
- ONLY discuss mental health, wellness, emotions, motivation, self-care, relationships, stress management, anxiety, depression, self-esteem, and personal growth
- If users try to discuss other topics (politics, technical help, general knowledge, etc.), politely redirect: "I'm here to support your mental wellness journey. Let's focus on how I can help you feel better and more positive today."
- Always bring conversations back to mental wellness and emotional support`;

  if (userContext && userContext.userProfile) {
    const { nickname, ageRange, goals, preferredSupport, moodHistory, reflections } = userContext.userProfile;
    
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
      contextInfo += `- Recent reflections: ${recentReflections}\n`;
    }
    
    return basePrompt + contextInfo;
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
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
};

// Helper function to convert text to speech using Google Text-to-Speech
const textToSpeechAudio = async (text) => {
  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F',
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,
        pitch: 0.0
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw new Error('Failed to convert text to speech');
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
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history for user
router.get('/history/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const chats = await Chat.find({ 
      firebaseUid, 
      isActive: true 
    }).sort({ updatedAt: -1 }).select('title createdAt updatedAt _id');

    res.json({
      success: true,
      chats
    });

  } catch (error) {
    console.error('Error getting chat history:', error);
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
    console.error('Error updating chat title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    // Close any active Google Live Audio session
    if (googleLiveAudioService.hasSession(chatId)) {
      googleLiveAudioService.closeSession(chatId);
    }

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
    console.error('Error deleting chat:', error);
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
    console.error('Error getting chat:', error);
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
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send text message
router.post('/:chatId/message', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, messageType = 'text', audioMode = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const systemPrompt = getSystemPrompt(chat.context);
      
      // Build conversation history for context
      const conversationHistory = chat.messages.slice(-10).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      const result = await model.generateContent(prompt);
      aiResponse = result.response.text();
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      console.error('Error details:', {
        message: geminiError.message,
        code: geminiError.code,
        status: geminiError.status
      });
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Convert to audio if in audio mode
    let audioResponse = null;
    let audioResponseUrl = null;
    
    if (audioMode) {
      try {
        audioResponse = await textToSpeechAudio(aiResponse);
        
        // Save the audio response
        const audioFileName = `response-${Date.now()}.mp3`;
        const audioFilePath = path.join('uploads/audio', audioFileName);
        fs.writeFileSync(audioFilePath, audioResponse);
        audioResponseUrl = `http://localhost:5000/uploads/audio/${audioFileName}`;
      } catch (ttsError) {
        console.error('Error generating audio response:', ttsError);
        // Continue without audio if TTS fails
      }
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

    res.json({
      success: true,
      message: aiResponse,
      messageType: audioMode ? 'audio' : 'text',
      audioUrl: audioResponseUrl
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Google Live Audio Dialogue session
router.post('/:chatId/live-audio/start', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create Google Live Audio session
    await googleLiveAudioService.createSession(chatId, chat.context);

    // Set up event listeners for this chat
    googleLiveAudioService.on('response', (sessionChatId, response) => {
      if (sessionChatId === chatId) {
        // Save AI response to database
        saveAIResponse(chatId, response);
      }
    });

    res.json({
      success: true,
      message: 'Google Live Audio session started successfully'
    });

  } catch (error) {
    console.error('Error starting Google Live Audio session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to save AI response
async function saveAIResponse(chatId, response) {
  try {
    const chat = await Chat.findById(chatId);
    if (chat) {
      const aiMessage = {
        text: response.text || '[Audio Response]',
        sender: 'ai',
        messageType: response.audioUrl ? 'audio' : 'text',
        audioUrl: response.audioUrl,
        timestamp: response.timestamp || new Date()
      };

      chat.messages.push(aiMessage);
      await chat.save();
    }
  } catch (error) {
    console.error('Error saving AI response:', error);
  }
}

// Send audio message to Google Live Audio Dialogue
router.post('/:chatId/live-audio/send', upload.single('audio'), async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if Google Live Audio session is active
    if (!googleLiveAudioService.hasSession(chatId)) {
      return res.status(400).json({ error: 'No active Google Live Audio session' });
    }

    // Read audio file
    const audioBuffer = fs.readFileSync(req.file.path);
    
    // Send to Google Live Audio
    await googleLiveAudioService.sendAudio(chatId, audioBuffer, req.file.mimetype);
    
    const audioUrl = `http://localhost:5000/uploads/audio/${req.file.filename}`;
    
    // Add user audio message
    const userMessage = {
      text: '[Live Audio Message]',
      sender: 'user',
      messageType: 'audio',
      audioUrl: audioUrl,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);
    await chat.save();

    res.json({
      success: true,
      message: 'Audio sent to Google Live Audio session',
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error('Error sending audio to Google Live Audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check Google Live Audio session status
router.get('/:chatId/live-audio/status', async (req, res) => {
  try {
    const { chatId } = req.params;
    const isActive = googleLiveAudioService.hasSession(chatId);

    res.json({
      success: true,
      isActive: isActive,
      message: isActive ? 'Google Live Audio session is active' : 'No active Google Live Audio session'
    });

  } catch (error) {
    console.error('Error checking Google Live Audio session status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop Google Live Audio Dialogue session
router.post('/:chatId/live-audio/stop', async (req, res) => {
  try {
    const { chatId } = req.params;

    googleLiveAudioService.closeSession(chatId);

    res.json({
      success: true,
      message: 'Google Live Audio session stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping Google Live Audio session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send audio message (legacy - keeping for backward compatibility)
router.post('/:chatId/audio', upload.single('audio'), async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const chat = await Chat.findOne({ _id: chatId, isActive: true });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Transcribe the audio using Google Speech-to-Text
    const audioBuffer = fs.readFileSync(req.file.path);
    const transcription = await transcribeAudio(audioBuffer, req.file.mimetype);
    
    const audioUrl = `http://localhost:5000/uploads/audio/${req.file.filename}`;
    
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const systemPrompt = getSystemPrompt(chat.context);
      
      const conversationHistory = chat.messages.slice(-10).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      const result = await model.generateContent(prompt);
      aiResponse = result.response.text();
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      console.error('Error details:', {
        message: geminiError.message,
        code: geminiError.code,
        status: geminiError.status
      });
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Convert AI response to audio using Google Text-to-Speech
    let audioResponse = null;
    let audioResponseUrl = null;
    
    try {
      audioResponse = await textToSpeechAudio(aiResponse);
      
      // Save the audio response
      const audioFileName = `response-${Date.now()}.mp3`;
      const audioFilePath = path.join('uploads/audio', audioFileName);
      fs.writeFileSync(audioFilePath, audioResponse);
      audioResponseUrl = `http://localhost:5000/uploads/audio/${audioFileName}`;
    } catch (ttsError) {
      console.error('Error generating audio response:', ttsError);
      // Continue without audio if TTS fails
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

    res.json({
      success: true,
      message: aiResponse,
      messageType: 'audio',
      audioUrl: audioResponseUrl
    });

  } catch (error) {
    console.error('Error processing audio message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
