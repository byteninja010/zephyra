const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class SimpleLiveAudioService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  // Process audio with Live Audio Dialogue (simplified)
  async processAudioMessage(chatId, audioBuffer, mimeType, userContext) {
    try {
      
      // For now, let's use a hybrid approach:
      // 1. Use Gemini 1.5 Pro with audio input capability
      // 2. Generate text response
      // 3. Convert to speech
      
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Convert audio to base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // Get system prompt
      const systemPrompt = this.getSystemPrompt(userContext);
      
      // Create prompt with audio
      const prompt = `${systemPrompt}

Please respond as Zephyra, the mental wellness companion. The user has sent you an audio message. Please provide a supportive, empathetic response that would be helpful for someone seeking mental wellness support.`;

      // Generate content with audio
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        }
      ]);

      const aiResponse = result.response.text();
      
      // Convert to speech
      const audioUrl = await this.textToSpeech(aiResponse, chatId);
      
      return {
        success: true,
        message: aiResponse,
        messageType: 'audio',
        audioUrl: audioUrl
      };
      
    } catch (error) {
      console.error('Error processing live audio:', error);
      throw error;
    }
  }

  // Convert text to speech
  async textToSpeech(text, chatId) {
    try {
      // For now, return a placeholder
      // In a real implementation, you'd use Google TTS
      const audioFileName = `live-response-${chatId}-${Date.now()}.mp3`;
      const audioFilePath = path.join('uploads/audio', audioFileName);
      
      // Create a simple audio file (placeholder)
      // In production, you'd use Google Text-to-Speech API
      const placeholderAudio = Buffer.from('RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary');
      fs.writeFileSync(audioFilePath, placeholderAudio);
      
      return `http://localhost:5000/uploads/audio/${audioFileName}`;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      return null;
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

module.exports = new SimpleLiveAudioService();