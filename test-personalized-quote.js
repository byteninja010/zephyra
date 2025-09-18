// Test script for personalized quote generation
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testPersonalizedQuote() {
  try {
    console.log('🧪 Testing Personalized Quote Generation');
    console.log('=====================================');
    
    // First, create a test user
    console.log('\n1. Creating test user...');
    const createUserResponse = await axios.post(`${API_URL}/api/auth/create-user`, {
      firebaseUid: 'test-user-' + Date.now()
    });
    
    if (createUserResponse.data.success) {
      const firebaseUid = createUserResponse.data.user.firebaseUid;
      console.log('✅ Test user created:', firebaseUid);
      
      // Add some test mood data
      console.log('\n2. Adding test mood data...');
      await axios.post(`${API_URL}/api/auth/user/${firebaseUid}/mood`, {
        mood: 'happy',
        note: 'Feeling great today!'
      });
      
      await axios.post(`${API_URL}/api/auth/user/${firebaseUid}/mood`, {
        mood: 'calm',
        note: 'Peaceful morning'
      });
      
      console.log('✅ Test mood data added');
      
      // Test personalized quote generation
      console.log('\n3. Testing personalized quote generation...');
      const quoteResponse = await axios.get(`${API_URL}/api/auth/user/${firebaseUid}/personalized-quote`);
      
      if (quoteResponse.data.success) {
        console.log('✅ Personalized quote generated successfully!');
        console.log('📝 Quote:', quoteResponse.data.quote);
        console.log('⏰ Generated at:', quoteResponse.data.generatedAt);
      } else {
        console.log('❌ Failed to generate personalized quote');
      }
      
    } else {
      console.log('❌ Failed to create test user');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPersonalizedQuote();
