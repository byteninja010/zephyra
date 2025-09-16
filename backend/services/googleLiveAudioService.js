const { GoogleGenerativeAI, Modality, MediaResolution } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class GoogleLiveAudioService extends EventEmitter {
  constructor() {
    super();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.activeSessions = new Map(); // Store active sessions by chatId
  }

  // Create a persistent live audio session
  async createSession(chatId, userContext) {
    try {
      
      const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
      
      const config = {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'en-US-Neural2-F', // Calm, supportive voice
            }
          }
        },
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
      };

      // Get system prompt for mental wellness AI
      const systemPrompt = this.getSystemPrompt(userContext);

      const session = await this.genAI.live.connect({
        model,
        callbacks: {
          onopen: () => {
            this.emit('sessionOpened', chatId);
          },
          onmessage: (message) => {
            this.handleModelResponse(chatId, message);
          },
          onerror: (error) => {
            console.error(`Google Live Audio session error for chat ${chatId}:`, error);
            this.emit('sessionError', chatId, error);
          },
          onclose: (closeEvent) => {
            this.activeSessions.delete(chatId);
            this.emit('sessionClosed', chatId);
          },
        },
        config
      });

      // Send initial system prompt
      session.sendClientContent({
        turns: [systemPrompt]
      });

      this.activeSessions.set(chatId, {
        session: session,
        userContext: userContext,
        messageHistory: [],
        isActive: true,
        createdAt: new Date()
      });

      return session;
    } catch (error) {
      console.error('Error creating Google Live Audio session:', error);
      throw error;
    }
  }

  // Handle model responses from Google Live Audio
  handleModelResponse(chatId, message) {
    
    if (message.serverContent?.modelTurn?.parts) {
      const parts = message.serverContent.modelTurn.parts;
      
      let textResponse = '';
      let audioResponse = null;
      
      parts.forEach(part => {
        if (part.text) {
          textResponse += part.text;
        }
        
        if (part.inlineData) {
          // Save audio response
          const audioUrl = this.saveAudioResponse(chatId, part.inlineData.data, part.inlineData.mimeType);
          audioResponse = audioUrl;
        }
      });

      // Emit response event
      this.emit('response', chatId, {
        text: textResponse,
        audioUrl: audioResponse,
        timestamp: new Date()
      });

      // Update session history
      const sessionData = this.activeSessions.get(chatId);
      if (sessionData) {
        sessionData.messageHistory.push({
          type: 'ai_response',
          text: textResponse,
          audioUrl: audioResponse,
          timestamp: new Date()
        });
      }
    }
  }

  // Send audio to the live session
  async sendAudio(chatId, audioBuffer, mimeType) {
    const sessionData = this.activeSessions.get(chatId);
    if (!sessionData) {
      throw new Error(`No active session found for chat ${chatId}`);
    }

    try {
      // Convert audio to base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // Send to Google Live Audio
      sessionData.session.sendClientContent({
        audio: {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType,
          },
        },
      });

      // Update session history
      sessionData.messageHistory.push({
        type: 'user_audio',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error sending audio to Google Live Audio:', error);
      throw error;
    }
  }

  // Save audio response to file
  saveAudioResponse(chatId, audioData, mimeType) {
    try {
      const audioFileName = `live-audio-${chatId}-${Date.now()}.wav`;
      const audioFilePath = path.join('uploads/audio', audioFileName);
      
      // Convert base64 to buffer and save
      const audioBuffer = Buffer.from(audioData, 'base64');
      fs.writeFileSync(audioFilePath, audioBuffer);
      
      return `http://localhost:5000/uploads/audio/${audioFileName}`;
    } catch (error) {
      console.error('Error saving audio response:', error);
      return null;
    }
  }

  // Close session
  closeSession(chatId) {
    const sessionData = this.activeSessions.get(chatId);
    if (sessionData) {
      sessionData.session.close();
      this.activeSessions.delete(chatId);
    }
  }

  // Check if session exists
  hasSession(chatId) {
    return this.activeSessions.has(chatId);
  }

  // Get session data
  getSession(chatId) {
    return this.activeSessions.get(chatId);
  }

  // Get system prompt for mental wellness AI
  getSystemPrompt(userContext) {
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
  }
}

module.exports = new GoogleLiveAudioService();
