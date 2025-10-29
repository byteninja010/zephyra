const express = require('express');
const User = require('../models/User');
const { GoogleGenAI } = require('@google/genai');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Retry function for Gemini API calls with exponential backoff
async function retryGeminiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.status === 503 || error.status === 429 || error.status === 500) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Analyze canvas drawing using Gemini Vision
router.post('/analyze', async (req, res) => {
  try {
    const { firebaseUid, imageData } = req.body;

    if (!firebaseUid || !imageData) {
      return res.status(400).json({ error: 'Firebase UID and image data are required' });
    }

    // Get user context for personalized analysis
    const user = await User.findOne({ firebaseUid, isActive: true });
    
    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Prepare the prompt for Gemini Vision
    const analysisPrompt = `You are analyzing a drawing created by someone as a form of emotional expression.

Analyze this drawing carefully and interpret the emotional state behind it by considering:

1. **Colors used**: What emotions do the color choices suggest?
   - Warm colors (red, orange, yellow): energy, passion, warmth, or agitation
   - Cool colors (blue, green, purple): calm, peace, sadness, or reflection
   - Dark colors: heaviness, depth, introspection
   - Bright colors: joy, optimism, vitality

2. **Stroke patterns**: What do the brushstrokes reveal?
   - Smooth, flowing lines: calmness, fluidity
   - Sharp, jagged lines: tension, anxiety, energy
   - Circular motions: contemplation, cycles, wholeness
   - Chaotic scribbles: overwhelm, release, confusion
   - Deliberate shapes: control, structure, clarity

3. **Overall composition**: How is the space used?
   - Centered: focused, balanced
   - Scattered: dispersed energy, busy mind
   - Minimal: simplicity, calm, or emptiness
   - Dense: fullness, complexity, intensity

4. **Visual style and energy**: What's the overall feeling?

Based on your analysis, respond with a JSON object in this exact format:
{
  "mood": "one word mood (e.g., calm, anxious, joyful, reflective, tense, peaceful, energized, contemplative, restless, serene)",
  "moodDescription": "a 1-2 sentence poetic interpretation of the emotion you detected in the drawing",
  "colorAnalysis": "brief analysis of the color palette and what it suggests",
  "strokeAnalysis": "brief analysis of the stroke patterns and energy",
  "activitySuggestion": "a short, specific activity that matches this emotional state (e.g., 'Take a mindful walk in nature' or 'Journal about what's weighing on your mind' or 'Dance to your favorite upbeat music')",
  "encouragement": "a warm, supportive message (1 sentence)"
}

Be empathetic, insightful, and supportive. Focus on emotional resonance, not technical art critique.`;

    // Call Gemini Vision API with the image
    const result = await retryGeminiCall(() =>
      genAI.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          {
            parts: [
              { text: analysisPrompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    );
    
    const responseText = result.candidates[0].content.parts[0].text;

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback response
      analysis = {
        mood: "contemplative",
        moodDescription: "Your drawing reveals a thoughtful, introspective state of mind.",
        colorAnalysis: "The colors suggest a complex emotional landscape.",
        strokeAnalysis: "Your brushstrokes show expression and creativity.",
        activitySuggestion: "Take a moment to reflect on what you've created and how it makes you feel.",
        encouragement: "Art is a beautiful way to explore your inner world."
      };
    }

    // Mind Canvas analysis is for display only - does not update mood history
    // Users can explore their emotions through drawing without it being tracked

    res.json({
      success: true,
      analysis: {
        mood: analysis.mood,
        moodDescription: analysis.moodDescription,
        colorAnalysis: analysis.colorAnalysis,
        strokeAnalysis: analysis.strokeAnalysis,
        activitySuggestion: analysis.activitySuggestion,
        encouragement: analysis.encouragement
      },
      message: 'Canvas analyzed successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to analyze canvas drawing',
      details: error.message 
    });
  }
});

// Get canvas history for a user
router.get('/history/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { limit = 10 } = req.query;

    const user = await User.findOne({ firebaseUid, isActive: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter mood history entries that came from Mind Canvas
    const canvasHistory = user.moodHistory
      .filter(entry => entry.note && entry.note.startsWith('Mind Canvas:'))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      canvasHistory
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

