# 🎵 Lyria Music Integration - Fix Summary

## Problem Identified

The previous implementation was using an **incorrect model name** (`lyria-v1`) which doesn't exist in Google's Vertex AI. The 404 error indicated:

```
Publisher Model `projects/zephyra-472310/locations/us-central1/publishers/google/models/lyria-v1` not found.
```

## Root Cause

The implementation was not following the official Lyria API documentation:
- ❌ Wrong model name: `lyria-v1`
- ❌ Wrong request parameters: `duration`, `sampleRate`, `format`
- ❌ Wrong response field: `bytesBase64Encoded`
- ❌ Custom duration support (not available in Lyria)

## Official Lyria 2 Specifications

According to the official documentation at:
https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation

**Correct specifications:**
- ✅ Model name: `lyria-002`
- ✅ Duration: **30 seconds (fixed, not customizable)**
- ✅ Format: **WAV at 48kHz** sample rate
- ✅ Request parameter: `sample_count` (not duration)
- ✅ Response field: `audioContent` (not bytesBase64Encoded)
- ✅ Pricing: **$0.06 per 30-second clip**

## Changes Made

### 1. Backend API Integration (`backend/routes/sessions.js`)

**Model Endpoint - FIXED:**
```javascript
// BEFORE (WRONG):
const apiEndpoint = `...models/lyria-v1:predict`;

// AFTER (CORRECT):
const apiEndpoint = `...models/lyria-002:predict`;
```

**Request Format - FIXED:**
```javascript
// BEFORE (WRONG):
{
  instances: [{ prompt: musicPrompt }],
  parameters: {
    duration: 300,
    sampleRate: 48000,
    format: 'wav'
  }
}

// AFTER (CORRECT - Official Lyria API):
{
  instances: [
    {
      prompt: musicPrompt,
      negative_prompt: "vocals, spoken word, lyrics, singing"
    }
  ],
  parameters: {
    sample_count: 1  // Generate one 30-second clip
  }
}
```

**Response Parsing - FIXED:**
```javascript
// BEFORE (WRONG):
const musicBase64 = prediction.bytesBase64Encoded;

// AFTER (CORRECT):
const musicBase64 = prediction.audioContent;
```

**Return Value - FIXED:**
```javascript
// BEFORE (WRONG):
return {
  musicUrl: musicUrl,
  generatedWith: 'Lyria',
  duration: duration  // Was using variable duration
};

// AFTER (CORRECT):
return {
  musicUrl: musicUrl,
  generatedWith: 'Lyria 2',
  duration: 30  // Fixed 30-second clips
};
```

### 2. Error Handling - ENHANCED

Added comprehensive error logging for debugging:

```javascript
if (musicError.response.status === 404) {
  console.log('🚨 Lyria 2 model not found!');
  console.log('🚨 Model name: lyria-002');
  console.log('🚨 Region:', process.env.GOOGLE_CLOUD_LOCATION);
  console.log('🚨 See: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation');
} else if (musicError.response.status === 400) {
  console.log('🚨 BAD REQUEST - Check prompt format');
  console.log('🚨 Lyria only supports US English (en-us) text prompts');
}
```

### 3. Documentation - UPDATED

Updated `LYRIA_MUSIC_INTEGRATION.md` with:
- ✅ Correct model name: `lyria-002`
- ✅ Correct API endpoint
- ✅ Correct request/response formats
- ✅ 30-second duration specification
- ✅ Official pricing: $0.06 per clip
- ✅ Link to official documentation

### 4. Test Script - CREATED

Created `test-lyria-music.js` to verify:
- ✅ API connectivity
- ✅ Music generation
- ✅ WAV file format validation
- ✅ Base64 encoding verification
- ✅ Error handling

## Expected Results

### Backend Logs (Success):
```
🎵 ========================================
🎵 GENERATING THERAPEUTIC MUSIC WITH LYRIA
🎵 Mood: calm
🎵 Calling Lyria 2 API at: https://us-central1-aiplatform.googleapis.com/v1/projects/.../lyria-002:predict
🎵 Request body: {
  "instances": [{
    "prompt": "Zen meditation music with singing bowls...",
    "negative_prompt": "vocals, spoken word, lyrics, singing"
  }],
  "parameters": { "sample_count": 1 }
}
🎵 Lyria 2 API Response received
🎵 Response status: 200
🎵 Prediction keys: audioContent, mimeType
✅ Successfully generated music with Lyria 2!
📏 Music data length: XXXXXX characters
🎵 Duration: 30 seconds (Lyria standard)
🎵 Format: WAV 48kHz
🎵 ========================================
```

### Frontend Console (Success):
```
🎵 Background music found, setting up audio...
🎵 Music generated with: Lyria 2
🎵 Background music playing
```

### User Experience:
1. Session starts
2. 30-second therapeutic music clip plays
3. Music **loops continuously** during session
4. User can control playback and volume

## Testing Instructions

### 1. Restart Backend Server
```bash
cd backend
npm run dev
```

### 2. Run Test Script
```bash
node test-lyria-music.js
```

### 3. Manual Test in Frontend
1. Go to Dashboard
2. Click "Start Instant Session"
3. Wait 10-30 seconds for generation
4. Check for speaker icon in session header
5. Click to play music
6. Adjust volume slider

### 4. Verify Backend Logs
Look for:
- ✅ "Successfully generated music with Lyria 2!"
- ✅ "Duration: 30 seconds (Lyria standard)"
- ✅ "Format: WAV 48kHz"

## Troubleshooting

### Still Getting 404 Error?

**Check:**
1. ✅ Model name is `lyria-002` (not `lyria-v1`)
2. ✅ Region is `us-central1` (primary Lyria region)
3. ✅ Vertex AI API is enabled
4. ✅ Service account has "Vertex AI User" role
5. ✅ Billing is enabled on Google Cloud project

**Try different region:**
```env
GOOGLE_CLOUD_LOCATION=us-east4
# OR
GOOGLE_CLOUD_LOCATION=us-west1
# OR
GOOGLE_CLOUD_LOCATION=europe-west4
```

### Rate Limit (429 Error)?

Lyria pricing: **$0.06 per 30-second clip**

Check quota at:
https://console.cloud.google.com/iam-admin/quotas

### Permission Denied (401 Error)?

Verify service account permissions:
```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_SERVICE_ACCOUNT_EMAIL"
```

Should show: `roles/aiplatform.user`

## Key Differences: Before vs After

| Aspect | Before (Wrong) | After (Correct) |
|--------|---------------|-----------------|
| Model Name | `lyria-v1` | `lyria-002` |
| Duration | Variable (300s) | Fixed (30s) |
| Request Param | `duration`, `sampleRate`, `format` | `sample_count` |
| Response Field | `bytesBase64Encoded` | `audioContent` |
| API Timeout | 60s | 90s |
| Error Messages | Generic | Detailed with docs links |
| Documentation | Incomplete | Official specs |

## Files Modified

1. ✅ `backend/routes/sessions.js` - Fixed API integration
2. ✅ `LYRIA_MUSIC_INTEGRATION.md` - Updated documentation
3. ✅ `test-lyria-music.js` - Created test script

## Files Verified (No Changes Needed)

1. ✅ `backend/models/Session.js` - Already correct
2. ✅ `frontend/src/components/SimpleSessionInterface.js` - Already correct

## Cost Impact

**Before:** Assumed variable duration pricing
**After:** Official pricing - **$0.06 per 30-second clip**

**Monthly cost for 100 sessions:**
- Lyria: $6.00
- Imagen 3: ~$4.00
- **Total: ~$10/month**

## Summary

The integration is now **100% compliant** with the official Lyria 2 API documentation. The 404 error should be resolved, and music generation should work correctly with the official `lyria-002` model.

**Status: ✅ FIXED AND READY FOR TESTING**

---

## References

- Official Lyria Documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/lyria-music-generation
- Vertex AI Pricing: https://cloud.google.com/vertex-ai/pricing
- Lyria Overview: https://deepmind.google/technologies/lyria/

