const axios = require('axios');

// Test script to verify authentication data
async function testAuth() {
  try {
    console.log('🧪 Testing authentication data...');
    
    // Test 1: Check if we can get user data
    console.log('\n1. Testing user validation...');
    
    // You'll need to replace this with your actual secret code
    const testSecretCode = 'YOUR_SECRET_CODE_HERE';
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/validate-secret-code', {
        secretCode: testSecretCode
      });
      
      if (response.data.success) {
        console.log('✅ User validation successful');
        console.log('User data:', response.data.user);
        
        const firebaseUid = response.data.user.firebaseUid;
        const secretCode = response.data.user.secretCode;
        
        // Test 2: Test session completion with the user data
        console.log('\n2. Testing session completion...');
        
        // Create a test session first
        const sessionResponse = await axios.post('http://localhost:5000/api/sessions/start-instant', {
          firebaseUid: firebaseUid,
          userContext: {}
        });
        
        if (sessionResponse.data.success) {
          const sessionId = sessionResponse.data.session.sessionId;
          console.log('✅ Test session created:', sessionId);
          
          // Test completion
          const completionResponse = await axios.post(`http://localhost:5000/api/sessions/complete/${sessionId}`, {
            firebaseUid: firebaseUid,
            secretCode: secretCode,
            summary: 'Test session completion'
          });
          
          console.log('✅ Session completion test result:', completionResponse.data);
        } else {
          console.log('❌ Failed to create test session:', sessionResponse.data);
        }
        
      } else {
        console.log('❌ User validation failed:', response.data);
      }
      
    } catch (error) {
      console.log('❌ Error testing user validation:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions for the user
console.log('🔧 AUTHENTICATION TEST SCRIPT');
console.log('==============================');
console.log('');
console.log('To run this test:');
console.log('1. Replace YOUR_SECRET_CODE_HERE with your actual secret code');
console.log('2. Run: node test-auth.js');
console.log('');
console.log('This will test:');
console.log('- User validation with secret code');
console.log('- Session creation');
console.log('- Session completion with authentication data');
console.log('');

// Uncomment the line below to run the test
// testAuth();
