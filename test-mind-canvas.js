/**
 * Test script for Mind Canvas feature
 * 
 * This script tests the complete Mind Canvas workflow:
 * 1. Creates a test user
 * 2. Submits a canvas drawing for analysis
 * 3. Verifies the AI mood interpretation
 * 4. Checks that the mood is saved to user history
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

async function testMindCanvas() {
  console.log('🎨 Testing Mind Canvas Feature...\n');

  try {
    // Step 1: Create a test user
    console.log('Step 1: Creating test user...');
    const createUserResponse = await axios.post(`${API_BASE_URL}/auth/create-user`, {
      firebaseUid: `test_mind_canvas_${Date.now()}`
    });

    if (!createUserResponse.data.success) {
      throw new Error('Failed to create test user');
    }

    const testUser = createUserResponse.data.user;
    console.log('✅ Test user created:', testUser.firebaseUid);
    console.log('   Secret code:', testUser.secretCode);

    // Step 2: Create a simple test canvas image (1x1 red pixel as base64)
    console.log('\nStep 2: Creating test canvas image...');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    console.log('✅ Test image created (1x1 red pixel)');

    // Step 3: Analyze the canvas drawing
    console.log('\nStep 3: Analyzing canvas drawing with AI...');
    console.log('⏳ This may take a few seconds...\n');
    
    const analyzeResponse = await axios.post(`${API_BASE_URL}/canvas/analyze`, {
      firebaseUid: testUser.firebaseUid,
      imageData: testImageData
    });

    if (!analyzeResponse.data.success) {
      throw new Error('Failed to analyze canvas: ' + analyzeResponse.data.error);
    }

    const analysis = analyzeResponse.data.analysis;
    console.log('✅ Canvas analysis completed!\n');
    console.log('📊 Analysis Results:');
    console.log('   Detected Mood:', analysis.mood);
    console.log('   Mood Description:', analysis.moodDescription);
    console.log('   Color Analysis:', analysis.colorAnalysis);
    console.log('   Stroke Analysis:', analysis.strokeAnalysis);
    console.log('   Activity Suggestion:', analysis.activitySuggestion);
    console.log('   Encouragement:', analysis.encouragement);

    // Step 4: Verify the mood was saved to user history
    console.log('\nStep 4: Verifying mood saved to user history...');
    const userResponse = await axios.get(`${API_BASE_URL}/auth/user/${testUser.firebaseUid}`);
    
    if (!userResponse.data.success) {
      throw new Error('Failed to retrieve user data');
    }

    const updatedUser = userResponse.data.user;
    const moodHistory = updatedUser.moodHistory || [];
    
    if (moodHistory.length === 0) {
      throw new Error('Mood history is empty - mood was not saved!');
    }

    const latestMood = moodHistory[moodHistory.length - 1];
    console.log('✅ Mood saved to user history!');
    console.log('   Latest mood:', latestMood.mood);
    console.log('   Note:', latestMood.note);
    console.log('   Date:', new Date(latestMood.date).toISOString());

    // Step 5: Get canvas history
    console.log('\nStep 5: Retrieving canvas history...');
    const historyResponse = await axios.get(`${API_BASE_URL}/canvas/history/${testUser.firebaseUid}?limit=5`);
    
    if (!historyResponse.data.success) {
      throw new Error('Failed to retrieve canvas history');
    }

    const canvasHistory = historyResponse.data.canvasHistory;
    console.log('✅ Canvas history retrieved!');
    console.log('   Total canvas entries:', canvasHistory.length);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Mind Canvas Test Completed Successfully!');
    console.log('='.repeat(60));
    console.log('\nTest Summary:');
    console.log('✅ User creation: PASSED');
    console.log('✅ Canvas image creation: PASSED');
    console.log('✅ AI mood analysis: PASSED');
    console.log('✅ Mood history save: PASSED');
    console.log('✅ Canvas history retrieval: PASSED');
    console.log('\n💡 The Mind Canvas feature is working correctly!');
    console.log('\nNext Steps:');
    console.log('1. Start the frontend: cd zephyra/frontend && npm start');
    console.log('2. Login with secret code:', testUser.secretCode);
    console.log('3. Click "Start Drawing" on the Mind Canvas card');
    console.log('4. Draw something and click "Reveal My Mood"');
    console.log('5. See your mood analysis and personalized activity suggestion!');

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

// Run the test
testMindCanvas();

