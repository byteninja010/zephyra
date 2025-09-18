const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testSessionCompletion() {
  try {
    console.log('🧪 Testing session completion endpoint...');
    
    // Test data
    const sessionId = 'session-instant_1758201117742_0u5we1szp';
    const firebaseUid = 'vr9gtnraKvecbzBTnoINtJWuicH3';
    const secretCode = 'S4QXBXHE';
    const summary = 'Test session completion';
    
    console.log('📤 Sending request with:');
    console.log('- sessionId:', sessionId);
    console.log('- firebaseUid:', firebaseUid);
    console.log('- secretCode:', secretCode);
    console.log('- summary:', summary);
    
    const response = await axios.post(`${API_URL}/api/sessions/complete/${sessionId}`, {
      firebaseUid,
      secretCode,
      summary
    });
    
    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testSessionCompletion();
