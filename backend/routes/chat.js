const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');
const speech = require('@google-cloud/speech');
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
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Initialize Google Cloud Speech client (for transcription only)
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json'
});

// System prompt for mental wellness AI
const getSystemPrompt = (userContext) => {
  const basePrompt = `You are Zephyra, a mental wellness companion for young people. Provide supportive, empathetic guidance.

CORE: Be empathetic, supportive, and encouraging. Focus on mental wellness, positivity, and emotional support. Never give medical advice.

STYLE: Provide thoughtful, detailed responses (3-5 sentences). Use warm, caring tone. Be genuine, helpful, and conversational. Offer practical advice and coping strategies.

SAFETY: If someone mentions self-harm, encourage emergency services. Stay focused on mental wellness topics.

RESPOND: Be thorough and supportive. Ask follow-up questions when appropriate. Provide actionable advice and emotional support.

CRITICAL: Always follow user's language preferences and instructions. If user asks to speak in a specific language, continue using that language throughout the conversation. Maintain consistency in language choice unless explicitly asked to change.`;

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
    console.log('🎵 Generating high-quality audio with Gemini 2.5 Flash Preview TTS via REST API...');
    
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
              console.log('✅ REST API call successful!');
              
              // Check for audio content
              if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                const parts = response.candidates[0].content.parts;
                
                for (const part of parts) {
                  if (part.inlineData && part.inlineData.data) {
                    console.log('✅ High-quality audio generated by Gemini 2.5 Flash Preview TTS');
                    console.log('🎵 Audio format:', part.inlineData.mimeType);
                    
                    // Convert PCM to WAV
                    const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
                    const wavBuffer = convertPCMToWAV(pcmBuffer, 24000, 1, 16);
                    console.log('🎵 Converted PCM to WAV format');
                    
                    resolve(wavBuffer);
                    return;
                  }
                }
              }
              
              console.log('⚠️ No audio content in Gemini TTS response, returning text only');
              resolve(null);
            } catch (parseError) {
              console.error('❌ Error parsing response:', parseError);
              resolve(null);
            }
          } else {
            console.log('❌ REST API call failed:', res.statusCode);
            console.log('Response:', data);
            resolve(null);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Request error:', error);
        resolve(null);
      });
      
      req.write(requestData);
      req.end();
    });
    
  } catch (error) {
    console.error('Error generating audio with Gemini 2.5 Flash Preview TTS:', error);
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
      const systemPrompt = getSystemPrompt(chat.context);
      
      // Build conversation history for context (last 100 messages for much better context)
      const conversationHistory = chat.messages.slice(-100).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      // Detect language preference from recent messages
      const recentMessages = chat.messages.slice(-10);
      const languagePreference = detectLanguagePreference(recentMessages);
      
      const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nLANGUAGE INSTRUCTION: ${languagePreference}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      // Log the full prompt being sent to AI for debugging
      console.log('🤖 Full prompt being sent to AI:');
      console.log('📝 System prompt length:', systemPrompt.length, 'characters');
      console.log('💬 Conversation history length:', conversationHistory.length, 'characters');
      console.log('🌐 Language preference:', languagePreference);
      console.log('📊 Total prompt length:', prompt.length, 'characters');
      console.log('🔍 Last 200 chars of prompt:', prompt.slice(-200));

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          topP: 0.9,
          topK: 40
        }
      });
      aiResponse = result.candidates[0].content.parts[0].text;
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      console.error('Error details:', {
        message: geminiError.message,
        code: geminiError.code,
        status: geminiError.status
      });
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Always generate high-quality audio using Gemini 2.5 Flash Preview TTS
    let audioResponse = null;
    let audioResponseUrl = null;
    
    try {
      audioResponse = await generateAudioWithGemini(aiResponse, null);
      
      if (audioResponse) {
        // Save the native audio response
        const audioFileName = `response-${Date.now()}.wav`;
        const audioFilePath = path.join('uploads/audio', audioFileName);
        fs.writeFileSync(audioFilePath, audioResponse);
        audioResponseUrl = `http://localhost:5000/uploads/audio/${audioFileName}`;
        console.log('✅ High-quality Gemini audio saved:', audioFilePath);
      } else {
        console.log('⚠️ No audio generated by Gemini, text-only response');
      }
    } catch (ttsError) {
      console.error('Error generating high-quality audio with Gemini:', ttsError);
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
      const systemPrompt = getSystemPrompt(chat.context);
      
      const conversationHistory = chat.messages.slice(-100).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');

      // Detect language preference from recent messages
      const recentMessages = chat.messages.slice(-10);
      const languagePreference = detectLanguagePreference(recentMessages);
      
      const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nLANGUAGE INSTRUCTION: ${languagePreference}\n\nPlease respond as Zephyra, the mental wellness companion. Be empathetic, supportive, and helpful.`;

      // Log the full prompt being sent to AI for debugging
      console.log('🤖 Full prompt being sent to AI (audio route):');
      console.log('📝 System prompt length:', systemPrompt.length, 'characters');
      console.log('💬 Conversation history length:', conversationHistory.length, 'characters');
      console.log('🌐 Language preference:', languagePreference);
      console.log('📊 Total prompt length:', prompt.length, 'characters');
      console.log('🔍 Last 200 chars of prompt:', prompt.slice(-200));

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          topP: 0.9,
          topK: 40
        }
      });
      aiResponse = result.candidates[0].content.parts[0].text;
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      console.error('Error details:', {
        message: geminiError.message,
        code: geminiError.code,
        status: geminiError.status
      });
      aiResponse = "I'm sorry, I'm having trouble connecting to my AI services right now. Please check your internet connection and try again. If the problem persists, please contact support.";
    }

    // Always generate high-quality audio using Gemini 2.5 Flash Preview TTS
    let audioResponse = null;
    let audioResponseUrl = null;
    
    try {
      audioResponse = await generateAudioWithGemini(aiResponse, null);
      
      if (audioResponse) {
        // Save the native audio response
        const audioFileName = `response-${Date.now()}.wav`;
        const audioFilePath = path.join('uploads/audio', audioFileName);
        fs.writeFileSync(audioFilePath, audioResponse);
        audioResponseUrl = `http://localhost:5000/uploads/audio/${audioFileName}`;
        console.log('✅ High-quality Gemini audio saved:', audioFilePath);
      } else {
        console.log('⚠️ No audio generated by Gemini, text-only response');
      }
    } catch (ttsError) {
      console.error('Error generating high-quality audio with Gemini:', ttsError);
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
