const { GoogleGenAI, Modality, MediaResolution } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class LiveAudioService extends EventEmitter {
  constructor() {
    super();
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.sessions = new Map(); // Store active sessions by chatId
    this.responseCallbacks = new Map(); // Store response callbacks by chatId
  }

  // Create a new live audio session
  async createSession(chatId, userContext, responseCallback = null) {
    try {
      const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
      
      const config = {
        responseModalities: [Modality.AUDIO],
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr', // Calm, supportive voice
            }
          }
        },
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
      };

      // Get system prompt for mental wellness
      const systemPrompt = this.getSystemPrompt(userContext);

      // Store response callback
      if (responseCallback) {
        this.responseCallbacks.set(chatId, responseCallback);
      }

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
            console.error(`Live audio session error for chat ${chatId}:`, error);
            this.emit('sessionError', chatId, error);
          },
          onclose: (closeEvent) => {
            this.sessions.delete(chatId);
            this.responseCallbacks.delete(chatId);
            this.emit('sessionClosed', chatId);
          },
        },
        config
      });

      // Send initial system prompt
      session.sendClientContent({
        turns: [systemPrompt]
      });

      this.sessions.set(chatId, session);
      return session;
    } catch (error) {
      console.error('Error creating live audio session:', error);
      throw error;
    }
  }

  // Handle model responses
  handleModelResponse(chatId, message) {
    
    if (message.serverContent?.modelTurn?.parts) {
      const part = message.serverContent.modelTurn.parts[0];
      
      if (part?.inlineData) {
        // Save audio response and notify callback
        const audioUrl = this.saveAudioResponse(chatId, part.inlineData.data, part.inlineData.mimeType);
        
        // Emit event for real-time updates
        this.emit('audioResponse', chatId, {
          audioUrl: audioUrl,
          text: '[Live Audio Response]',
          timestamp: new Date()
        });
        
        // Call response callback if available
        const callback = this.responseCallbacks.get(chatId);
        if (callback) {
          callback({
            success: true,
            message: '[Live Audio Response]',
            messageType: 'audio',
            audioUrl: audioUrl
          });
        }
      }
      
      if (part?.text) {
        
        // Emit text response event
        this.emit('textResponse', chatId, {
          text: part.text,
          timestamp: new Date()
        });
      }
    }
  }

  // Save audio response to file
  saveAudioResponse(chatId, audioData, mimeType) {
    try {
      const audioFileName = `live-response-${chatId}-${Date.now()}.wav`;
      const audioFilePath = path.join('uploads/audio', audioFileName);
      
      // Convert base64 to buffer and save
      const audioBuffer = Buffer.from(audioData, 'base64');
      fs.writeFileSync(audioFilePath, audioBuffer);
      
      const audioUrl = `http://localhost:5000/uploads/audio/${audioFileName}`;
      
      // Emit event with audio URL (this would be handled by WebSocket in real implementation)
      return audioUrl;
    } catch (error) {
      console.error('Error saving audio response:', error);
      throw error;
    }
  }

  // Send audio message to session
  async sendAudioMessage(chatId, audioBuffer, mimeType) {
    try {
      const session = this.sessions.get(chatId);
      if (!session) {
        throw new Error('No active session found for this chat');
      }

      // Convert audio to base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // Send audio to the live session
      session.sendClientContent({
        turns: [{
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        }]
      });

      return true;
    } catch (error) {
      console.error('Error sending audio message:', error);
      throw error;
    }
  }

  // Close session
  closeSession(chatId) {
    const session = this.sessions.get(chatId);
    if (session) {
      session.close();
      this.sessions.delete(chatId);
    }
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
- Use emojis sparingly and appropriately (😊, 💙, 🌟, 💪)
- Be genuine and authentic in your responses
- Show that you understand and care about their feelings
- Offer hope and encouragement while being realistic
- Use "I" statements to show personal care and attention
- End responses with supportive questions or gentle guidance when appropriate

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

module.exports = new LiveAudioService();
