# Mind Canvas 🎨

**"No words. Just colors — and AI feels what you draw."**

## Overview

Mind Canvas is an innovative feature in Zephyra that allows users to express their emotions through abstract art. Using advanced AI (Gemini Vision), the system analyzes drawings to interpret the user's emotional state and provides personalized activity suggestions.

## The Experience

### User Journey

1. **Draw Freely** - Users create abstract drawings on a digital canvas using various colors and brush sizes
2. **AI Analysis** - The drawing is analyzed for:
   - Color choices and emotional associations
   - Stroke patterns and energy levels
   - Overall composition and space usage
   - Visual style and feeling
3. **Mood Interpretation** - AI reveals:
   - Detected mood (e.g., calm, joyful, anxious, reflective)
   - Poetic mood description
   - Color and stroke analysis
   - Personalized activity suggestion
   - Encouraging message
4. **History Tracking** - All canvas sessions are saved to the user's mood history

## Technical Architecture

### Frontend Components

**Location:** `zephyra/frontend/src/components/MindCanvas.js`

**Key Features:**
- HTML5 Canvas API for drawing
- Touch and mouse support
- 12-color emotional palette
- Adjustable brush sizes (2-40px)
- Real-time drawing preview
- Beautiful result visualization with mood-based color gradients

**Technologies Used:**
- React Hooks (useState, useRef, useEffect)
- HTML5 Canvas API
- Tailwind CSS for styling
- Gradient-based UI design

### Backend API

**Location:** `zephyra/backend/routes/canvas.js`

**Endpoints:**

1. **POST /api/canvas/analyze**
   - Analyzes a canvas drawing using Gemini Vision API
   - Saves mood to user's history
   - Returns comprehensive mood analysis
   
   Request:
   ```json
   {
     "firebaseUid": "user123",
     "imageData": "data:image/png;base64,..."
   }
   ```
   
   Response:
   ```json
   {
     "success": true,
     "analysis": {
       "mood": "calm",
       "moodDescription": "Your drawing reveals a peaceful, serene state of mind.",
       "colorAnalysis": "The cool blues and greens suggest tranquility...",
       "strokeAnalysis": "Smooth, flowing lines indicate calmness...",
       "activitySuggestion": "Take a mindful walk in nature",
       "encouragement": "Your inner peace shines through your art."
     }
   }
   ```

2. **GET /api/canvas/history/:firebaseUid**
   - Retrieves user's canvas drawing history
   - Filters mood entries from Mind Canvas
   - Supports pagination

**AI Integration:**
- Model: `gemini-2.0-flash-exp` (Gemini Vision)
- Temperature: 0.7
- Max Output Tokens: 1000
- Retry logic with exponential backoff
- Fallback responses for API failures

### Data Model

Canvas analyses are stored in the User model's `moodHistory` array with a special note format:

```javascript
{
  mood: "calm",
  note: "Mind Canvas: Your drawing reveals a peaceful state...",
  date: "2025-01-15T10:30:00.000Z"
}
```

The "Mind Canvas:" prefix allows filtering canvas-specific mood entries.

## AI Prompt Design

The system uses a carefully crafted prompt that instructs the AI to analyze:

1. **Color Psychology**
   - Warm colors → energy, passion, agitation
   - Cool colors → calm, peace, sadness
   - Dark colors → heaviness, introspection
   - Bright colors → joy, optimism

2. **Stroke Patterns**
   - Smooth lines → calmness, fluidity
   - Jagged lines → tension, anxiety
   - Circular motions → contemplation
   - Chaotic scribbles → overwhelm, release

3. **Composition**
   - Centered → balance, focus
   - Scattered → dispersed energy
   - Minimal → simplicity, emptiness
   - Dense → complexity, intensity

The AI responds with structured JSON containing all analysis components.

## UI/UX Design

### Color Palette

The Mind Canvas features 12 emotionally expressive colors:
- Indigo, Purple, Pink, Red
- Orange, Yellow, Green, Teal
- Blue, Sky, Gray, Black

Each color is selected for its emotional resonance and artistic versatility.

### Result Visualization

Results are displayed with:
- **Mood Card** - Gradient background based on detected mood
- **Large Emoji** - Visual mood indicator
- **Analysis Sections** - Color-coded cards for different insights
- **Activity Suggestion** - Actionable, personalized advice
- **Encouragement** - Warm, supportive message

### Mood-Based Gradients

Each mood has a unique gradient:
- Calm → Blue to Cyan
- Joyful → Yellow to Pink
- Anxious → Orange to Red
- Reflective → Purple to Indigo
- And more...

## Integration with Zephyra

### Dashboard Integration

Mind Canvas appears as a featured section on the Dashboard with:
- Prominent placement above "Quick Actions"
- "NEW FEATURE" badge
- Descriptive tagline
- Eye-catching gradient design
- Large "Start Drawing" button

### Mood History Integration

All Mind Canvas sessions automatically:
- Save to user's mood history
- Count toward activity streaks
- Appear in mood graphs
- Contribute to wellness tracking

## Usage Instructions

### For Developers

**Setup:**
1. Ensure `GEMINI_API_KEY` is set in `.env`
2. Backend must be running on port 5000
3. Frontend must be running on port 3000

**Testing:**
```bash
cd zephyra
node test-mind-canvas.js
```

### For Users

1. Login to Zephyra
2. Click "Start Drawing" on the Mind Canvas card
3. Choose colors and draw freely
4. Click "✨ Reveal My Mood" when ready
5. View your mood analysis and activity suggestion
6. Click "Create Another Drawing" to continue

## Best Practices

### For Drawing
- Don't overthink it - draw what feels right
- Use colors that resonate with your current state
- Abstract shapes work better than detailed drawings
- Let emotions flow through the brush

### For Analysis
- Wait for the full analysis before interpreting
- Consider all aspects (color, stroke, composition)
- Try the suggested activity
- Draw regularly to track emotional patterns

## Performance Considerations

- **Canvas Size:** Optimized for responsive display
- **Image Compression:** PNG format with base64 encoding
- **API Calls:** Retry logic prevents transient failures
- **Response Time:** Typically 2-5 seconds for analysis
- **Storage:** Mood history pruned to last 30 days

## Future Enhancements

Potential improvements:
- [ ] Save actual canvas images (not just analysis)
- [ ] Canvas gallery view
- [ ] Share drawings (with privacy controls)
- [ ] Multiple brush types (pencil, marker, spray)
- [ ] Undo/redo functionality
- [ ] Color mixer tool
- [ ] Drawing tutorials for emotional expression
- [ ] Mood trends over time from canvas history
- [ ] Export drawings as images

## Troubleshooting

### Common Issues

**Issue:** "Failed to analyze canvas drawing"
- **Solution:** Check GEMINI_API_KEY is valid and has Vision API access

**Issue:** Canvas not responding to touch
- **Solution:** Ensure `touchAction: 'none'` is set on canvas element

**Issue:** Analysis takes too long
- **Solution:** Reduce canvas size or check network connection

**Issue:** Mood not appearing in history
- **Solution:** Verify user is authenticated and firebaseUid is valid

## Philosophy

Mind Canvas embodies the core Zephyra philosophy:
- **Accessible** - No artistic skill required
- **Introspective** - Encourages emotional awareness
- **Supportive** - Provides empathetic feedback
- **Beautiful** - Aesthetically pleasing experience
- **Meaningful** - Creates actionable insights

## Credits

- **AI Model:** Google Gemini 2.0 Flash (Vision)
- **UI Framework:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Canvas API:** HTML5 Canvas

---

**Remember:** There's no right or wrong way to draw. Your emotions are valid, and Mind Canvas is here to help you explore them in a safe, creative space.

🎨 **"No words. Just colors — and AI feels what you draw."** 🎨

