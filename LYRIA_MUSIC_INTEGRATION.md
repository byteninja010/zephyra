# 🎵 Lyria Music Generation Integration

## Overview

Zephyra now includes **therapeutic background music generation** using Google's **Lyria 2** AI (model: `lyria-002`), integrated seamlessly alongside the existing Imagen 3 background image generation. Each wellness session automatically generates mood-appropriate music to enhance the therapeutic experience.

**Key Specifications:**
- **Model**: `lyria-002` (Lyria 2)
- **Duration**: 30 seconds per clip (fixed)
- **Format**: WAV audio at 48kHz sample rate
- **Output**: High-quality instrumental music
- **Pricing**: $0.06 per 30-second clip

---

## 🎯 Features

### Automatic Music Generation
- **Mood-based music**: Music is generated based on the user's current emotional state
- **Therapeutic focus**: All prompts are designed for mental wellness and relaxation
- **Seamless integration**: Runs alongside Imagen 3 background generation
- **High-quality audio**: 48kHz WAV format for optimal sound quality
- **Loop playback**: Music loops continuously during the session

### User Controls
- **Play/Pause toggle**: Users can control music playback
- **Volume slider**: Adjustable volume (0-100%)
- **Visual indicators**: Speaker icons show playback status
- **Non-intrusive**: Music generation failures don't block the session

---

## 🏗️ Architecture

### Backend Components

#### 1. **Session Model** (`backend/models/Session.js`)
Added new fields to store music data:
```javascript
sessionData: {
  // ... existing fields ...
  backgroundMusic: String,      // Base64 audio data (data:audio/wav;base64,...)
  musicPrompt: String,          // Prompt used for generation
  musicGeneratedWith: String    // 'Lyria 2'
}
```

#### 2. **Music Generation Function** (`backend/routes/sessions.js`)
New function: `generateSessionMusic(userMood, sessionType, duration)`

**Features:**
- 16 mood-specific music prompts (calm, anxious, sad, happy, etc.)
- Therapeutic music descriptions (BPM, instruments, atmosphere)
- Vertex AI integration using same credentials as Imagen 3
- Graceful error handling with session continuation

**Example Prompts:**
- **Calm**: "Zen meditation music with singing bowls, perfect peace, 50 BPM, mindfulness support, serene atmosphere"
- **Anxious**: "Deep breathing-focused ambient music, grounding bass tones, 60 BPM, anxiety relief soundscape, slow and stable"
- **Happy**: "Light melodic patterns with natural harmonics, joy enhancement music, 95 BPM, positive mood amplification, bright"

#### 3. **API Endpoint** (`backend/routes/sessions.js`)
Updated endpoints:
- `/api/sessions/start-instant` - Generates music for instant sessions
- `/api/sessions/start/:sessionId` - Generates music for scheduled sessions

**Response includes:**
```javascript
{
  session: {
    // ... existing fields ...
    backgroundMusic: "data:audio/wav;base64,UklGR...",  // 30-second WAV clip
    musicPrompt: "Zen meditation music with singing bowls, perfect peace, 50 BPM...",
    musicGeneratedWith: "Lyria 2"
  }
}
```

### Frontend Components

#### 1. **SimpleSessionInterface** (`frontend/src/components/SimpleSessionInterface.js`)

**New State:**
```javascript
const [backgroundMusic, setBackgroundMusic] = useState(null);
const [isMusicPlaying, setIsMusicPlaying] = useState(false);
const [musicVolume, setMusicVolume] = useState(0.3);
```

**New Controls:**
- Play/Pause button with speaker icon
- Volume slider (appears when playing)
- Looping audio element

**Integration Points:**
- Loads music data when session loads
- Auto-sets volume to 30%
- Loops music continuously
- Cleans up on component unmount

---

## 🎨 Mood-to-Music Mapping

| Mood | BPM | Style | Purpose |
|------|-----|-------|---------|
| 😢 Sad | 60 | Gentle piano, soft ambient pads | Healing, comforting |
| 😔 Down | 70 | Peaceful acoustic guitar | Hopeful, uplifting |
| 😐 Neutral | 80 | Minimalist ambient | Balanced, meditative |
| 😊 Happy | 90 | Bright acoustic melody | Positive, energizing |
| 😄 Joyful | 100 | Light rhythms | Celebratory, warm |
| Anxious | 60 | Deep breathing music | Grounding, anxiety relief |
| Stressed | 65 | Flowing water sounds | Stress relief, relaxing |
| Calm | 50 | Zen meditation music | Perfect peace, mindfulness |
| Angry | 70 | Gradual release soundscape | Cooling, transformative |
| Tired | 65 | Restorative ambient | Energy renewal, rejuvenating |
| Lonely | 60 | Warm embracing harmonics | Connection, comfort |
| Hopeful | 75 | Sunrise-inspired progression | New beginnings, optimism |
| Overwhelmed | 55 | Spacious ambient | Release, expansion |

---

## 🔧 Technical Implementation

### API Integration

**Lyria 2 Vertex AI Endpoint:**
```
POST https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/lyria-002:predict
```

**Request Format (Official Lyria API):**
```json
{
  "instances": [{
    "prompt": "Zen meditation music with singing bowls, perfect peace, 50 BPM...",
    "negative_prompt": "vocals, spoken word, lyrics, singing"
  }],
  "parameters": {
    "sample_count": 1  // Generate one 30-second clip
  }
}
```

**Response Format:**
```json
{
  "predictions": [{
    "audioContent": "UklGRiQ...",  // Base64 WAV data
    "mimeType": "audio/wav"
  }],
  "deployedModelId": "...",
  "model": "projects/.../models/lyria-002",
  "modelDisplayName": "Lyria 2"
}
```

**Important Notes:**
- Lyria generates **30-second clips only** (not customizable)
- Format: **WAV at 48kHz** sample rate
- Prompts must be in **US English (en-us)** only
- Pricing: **$0.06 per 30-second clip**
- Output is **instrumental only** (use negative_prompt to exclude vocals)

### Audio Processing

1. **Generation**: Lyria 2 generates 30-second WAV audio clips (48kHz, stereo)
2. **Encoding**: Returned as base64 string in `audioContent` field
3. **Delivery**: Embedded in session response as data URL (`data:audio/wav;base64,...)
4. **Playback**: HTML5 Audio API in browser with looping enabled
5. **Looping**: JavaScript `loop` property set to `true` for continuous playback

---

## 🚀 Setup & Configuration

### Prerequisites

✅ All existing Vertex AI setup (same as Imagen 3)
- Google Cloud Project
- Vertex AI API enabled
- Service account credentials
- Environment variables configured

### Environment Variables

No additional variables needed! Uses existing setup:
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_PRIVATE_KEY_ID=...
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLOUD_CLIENT_EMAIL=...
GOOGLE_CLOUD_CLIENT_ID=...
```

### Deployment

1. **Backend**: Already deployed (no changes needed)
2. **Frontend**: Already deployed (no changes needed)
3. **Testing**: Start a session to test music generation

---

## 📊 Performance & Cost

### Performance Metrics
- **Generation Time**: ~10-30 seconds (parallel with image generation)
- **Audio Duration**: 30 seconds (fixed per Lyria 2 specification)
- **Audio Size**: ~1-2 MB per 30-second clip (base64 WAV)
- **Playback**: Instant (embedded in response, loops continuously)
- **Network**: Single request (no streaming)

### Cost Estimation

**Official Lyria 2 Pricing:**
- **$0.06 per 30-second clip** generated
- See: https://cloud.google.com/vertex-ai/pricing

**Estimated Usage:**
- 1 music generation per session
- Duration: 30 seconds per clip (loops for entire session)
- Monthly (100 sessions): 100 clips = **$6.00/month**
- Combined with Imagen 3 (~$4/month): **~$10/month total** for 100 sessions

---

## 🐛 Error Handling

### Graceful Degradation

The system is designed to **never block sessions** if music generation fails:

```javascript
// Backend logs errors but continues
catch (musicError) {
  console.log('⚠️ Lyria 2 music generation failed:', musicError.message);
  if (musicError.response?.status === 404) {
    console.log('🚨 Model lyria-002 not found in region');
  }
  console.log('🔄 Music generation failed, session will continue without background music');
  return null;
}
```

**Session continues with:**
- ✅ Background image (if available)
- ✅ Chat functionality
- ✅ All therapeutic features
- ❌ No background music

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Model `lyria-002` not available in region | Verify Lyria availability in your region, try us-central1 |
| 429 Rate Limit | Too many requests / quota exceeded | Wait or request quota increase at Google Cloud Console |
| 401 Unauthorized | Invalid credentials | Check service account has Vertex AI User role |
| 400 Bad Request | Invalid prompt format | Ensure prompt is in US English, check negative_prompt |
| Timeout | Generation taking too long | Increase timeout (currently 90s) or retry |

---

## 🎮 User Experience

### Session Start Flow

1. User clicks "Start Instant Session"
2. **Backend generates** (parallel):
   - Imagen 3 background image
   - Lyria therapeutic music
   - Personalized greeting
3. **Frontend receives**:
   - Background image (displayed)
   - Background music (loaded but paused)
   - Greeting message
4. **User interaction**:
   - Click speaker icon to play music
   - Adjust volume slider
   - Music loops until paused/session ends

### Visual Indicators

**Music Available:**
```
[🔇] [──────────] Complete Session [×]
```

**Music Playing:**
```
[🔊] [████──────] Complete Session [×]
     30% volume
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Start Session**
   ```
   Dashboard → Click "Start Instant Session"
   ```

2. **Check Backend Logs**
   ```
   🎵 GENERATING THERAPEUTIC MUSIC WITH LYRIA
   🎵 Mood: calm
   🎵 Calling Lyria 2 API at: https://us-central1-aiplatform.googleapis.com/...
   🎵 Music prompt: Zen meditation music with singing bowls, perfect peace, 50 BPM...
   ✅ Successfully generated music with Lyria 2!
   📏 Music data length: 1234567 characters
   🎵 Duration: 30 seconds (Lyria standard)
   🎵 Format: WAV 48kHz
   ```

3. **Frontend UI**
   - Speaker icon should appear in header
   - Click to toggle playback
   - Volume slider appears when playing

4. **Browser Console**
   ```
   🎵 Background music found, setting up audio...
   🎵 Music generated with: Lyria 2
   🎵 Background music playing
   ```

### Troubleshooting

**No music controls appearing:**
- Check session response includes `backgroundMusic`
- Verify console logs for music generation
- Check for JavaScript errors

**Music won't play:**
- Browser autoplay policies (user must interact first)
- Check audio data URL format
- Verify audio element ref is set

**Silent playback:**
- Check volume slider is not at 0
- Verify browser volume/mute settings
- Check audio element volume property

---

## 📝 Code Examples

### Backend: Music Generation
```javascript
// Generate 30-second music clip based on user mood
const userMood = await getUserMoodForBackground(firebaseUid);
const musicData = await generateSessionMusic(userMood, 'instant', 30);

if (musicData) {
  session.sessionData.backgroundMusic = musicData.musicUrl;  // data:audio/wav;base64,...
  session.sessionData.musicPrompt = musicData.prompt;
  session.sessionData.musicGeneratedWith = musicData.generatedWith;  // "Lyria 2"
  console.log('✅ Music generated successfully, duration:', musicData.duration, 'seconds');
}
```

### Frontend: Music Playback
```javascript
// Toggle music playback
const toggleBackgroundMusic = () => {
  if (isMusicPlaying) {
    backgroundMusicRef.current.pause();
  } else {
    backgroundMusicRef.current.play();
  }
};
```

---

## 🔮 Future Enhancements

### Potential Features
- 🎼 **Multiple track support**: Generate variations for different moods
- 🔀 **Dynamic transitions**: Smooth crossfades between mood changes
- 🎛️ **Advanced controls**: Tempo adjustment, instrument selection
- 💾 **Music library**: Cache generated tracks for reuse
- 📱 **Offline mode**: Download tracks for offline playback
- 🎨 **Visual sync**: Audio visualizer matching background image
- 🌐 **Multi-language**: Culturally-appropriate music styles

### API Improvements
- Use Lyria RealTime for interactive generation
- Stream audio chunks for faster playback start
- Generate shorter loops for better performance
- Add fallback to pre-composed music library

---

## 📚 Resources

### Official Documentation
- [Lyria Overview](https://deepmind.google/technologies/lyria/)
- [Lyria RealTime](https://deepmind.google/technologies/lyria/realtime/)
- [Vertex AI Music Generation](https://cloud.google.com/vertex-ai/generative-ai/docs/music/generate-music)
- [Gemini API Music Generation](https://ai.google.dev/gemini-api/docs/music-generation)

### Related Features
- Imagen 3 Integration: `IMAGEN3_SETUP.md`
- Session Management: `backend/routes/sessions.js`
- Session Interface: `frontend/src/components/SimpleSessionInterface.js`

---

## ✅ Integration Checklist

- [x] Session model updated with music fields
- [x] Lyria music generation function created
- [x] Music generation integrated in session start endpoints
- [x] Frontend music player controls added
- [x] Volume control implemented
- [x] Loop playback configured
- [x] Error handling implemented
- [x] Graceful degradation ensured
- [x] Console logging for debugging
- [x] Documentation created

---

## 🎉 Summary

Zephyra now provides a **complete multisensory therapeutic experience**:

- 🖼️ **Visual**: AI-generated background images (Imagen 3)
- 🎵 **Audio**: Therapeutic background music (Lyria)
- 💬 **Conversation**: AI wellness companion (Gemini)
- 🎨 **Interactive**: Mind Canvas art therapy

All features work **independently** - if one fails, others continue working!

**Integration complete. Enjoy your enhanced wellness sessions! 🌟**

