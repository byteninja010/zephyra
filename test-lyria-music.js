/**
 * Test script for Lyria Music Generation
 * Tests the Lyria 2 API integration in Zephyra
 */

require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

const API_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test user credentials
const TEST_FIREBASE_UID = 'test-user-lyria-' + Date.now();

async function testLyriaMusicGeneration() {
  console.log('\n🎵 ========================================');
  console.log('🎵 TESTING LYRIA MUSIC GENERATION');
  console.log('🎵 ========================================\n');

  try {
    // Step 1: Create a test user
    console.log('Step 1: Creating test user...');
    const userResponse = await axios.post(`${API_URL}/api/auth/create-user`, {
      firebaseUid: TEST_FIREBASE_UID
    });

    if (!userResponse.data.success) {
      throw new Error('Failed to create test user');
    }

    console.log('✅ Test user created:', userResponse.data.user.secretCode);

    // Step 2: Add a mood for the user (needed for music generation)
    console.log('\nStep 2: Adding mood check-in...');
    const moodResponse = await axios.post(`${API_URL}/api/auth/user/${TEST_FIREBASE_UID}/mood`, {
      mood: 'calm',
      note: 'Testing Lyria music generation'
    });

    console.log('✅ Mood added:', moodResponse.data.moodHistory[0].mood);

    // Step 3: Start an instant session (should trigger music generation)
    console.log('\nStep 3: Starting instant session...');
    console.log('⏳ This may take 30-60 seconds...');
    
    const sessionResponse = await axios.post(
      `${API_URL}/api/sessions/start-instant`,
      {
        firebaseUid: TEST_FIREBASE_UID,
        userContext: {
          nickname: 'Test User',
          mood: 'calm'
        }
      },
      {
        timeout: 120000 // 2 minute timeout
      }
    );

    if (!sessionResponse.data.success) {
      throw new Error('Failed to start session');
    }

    console.log('\n✅ Session started successfully!');
    console.log('Session ID:', sessionResponse.data.session.sessionId);
    console.log('Status:', sessionResponse.data.session.status);

    // Check if background music was generated
    console.log('\n🎵 ========================================');
    console.log('🎵 MUSIC GENERATION RESULTS');
    console.log('🎵 ========================================');

    if (sessionResponse.data.session.backgroundMusic) {
      console.log('✅ Background music: GENERATED');
      console.log('📏 Music data length:', sessionResponse.data.session.backgroundMusic.length, 'characters');
      console.log('🎵 Music generated with:', sessionResponse.data.session.musicGeneratedWith || 'Unknown');
      console.log('🎼 Music prompt:', sessionResponse.data.session.musicPrompt || 'N/A');
      
      // Verify it's a valid base64 WAV data URL
      if (sessionResponse.data.session.backgroundMusic.startsWith('data:audio/wav;base64,')) {
        console.log('✅ Music format: Valid WAV data URL');
        
        // Extract base64 data
        const base64Data = sessionResponse.data.session.backgroundMusic.split(',')[1];
        const bufferSize = Buffer.from(base64Data, 'base64').length;
        console.log('📦 Audio file size:', (bufferSize / 1024).toFixed(2), 'KB');
        
        // Verify it's a WAV file (should start with "RIFF")
        const buffer = Buffer.from(base64Data, 'base64');
        const header = buffer.toString('ascii', 0, 4);
        if (header === 'RIFF') {
          console.log('✅ Audio format: Valid WAV file');
        } else {
          console.log('⚠️ Warning: Audio header is not RIFF, got:', header);
        }
      } else {
        console.log('⚠️ Warning: Music is not in expected data URL format');
      }
      
      console.log('\n🎉 LYRIA MUSIC GENERATION TEST: PASSED');
    } else {
      console.log('❌ Background music: NOT GENERATED');
      console.log('ℹ️ This might be expected if:');
      console.log('   - Lyria API is not available in your region');
      console.log('   - API quota exceeded');
      console.log('   - Service account lacks permissions');
      console.log('   - Model lyria-002 not found');
      console.log('\n⚠️ LYRIA MUSIC GENERATION TEST: FAILED (no music generated)');
    }

    // Check background image as well
    console.log('\n🎨 ========================================');
    console.log('🎨 BACKGROUND IMAGE RESULTS');
    console.log('🎨 ========================================');
    
    if (sessionResponse.data.session.backgroundImage) {
      if (sessionResponse.data.session.backgroundImage.startsWith('data:image/')) {
        console.log('✅ Background image: GENERATED (Imagen 3)');
        console.log('🖼️ Generated with:', sessionResponse.data.session.generatedWith || 'Unknown');
      } else {
        console.log('✅ Background: Mood-based gradient fallback');
      }
    } else {
      console.log('⚠️ No background image');
    }

    console.log('\n🎵 ========================================');
    console.log('🎵 TEST COMPLETE');
    console.log('🎵 ========================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Backend server is not running!');
      console.error('Start it with: cd backend && npm run dev');
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('\n🎵 Lyria Music Generation Test');
console.log('🎵 Testing official Lyria 2 API (model: lyria-002)');
console.log('🎵 Expected: 30-second WAV clips at 48kHz\n');

testLyriaMusicGeneration();

