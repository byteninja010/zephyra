// Browser Console Test - Copy and paste this into your browser console
// when you're on the sessions page (http://localhost:3000/sessions)

console.log('🧪 BROWSER AUTHENTICATION TEST');
console.log('===============================');

// Test 1: Check localStorage
console.log('\n1. Checking localStorage...');
const firebaseUid = localStorage.getItem('firebaseUid');
const secretCode = localStorage.getItem('userSecretCode');
const userId = localStorage.getItem('userId');

console.log('firebaseUid:', firebaseUid);
console.log('secretCode:', secretCode);
console.log('userId:', userId);

if (!firebaseUid || !secretCode) {
  console.log('❌ Missing authentication data in localStorage!');
  console.log('Please login again.');
} else {
  console.log('✅ Authentication data found in localStorage');
}

// Test 2: Test session completion directly
async function testSessionCompletion() {
  console.log('\n2. Testing session completion...');
  
  try {
    // Get the current session ID (you'll need to start a session first)
    const currentSessionId = 'session-instant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Test the sessionService.completeSession function
    const response = await fetch(`http://localhost:5000/api/sessions/test-completion/${currentSessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseUid: firebaseUid,
        secretCode: secretCode,
        summary: 'Browser test session'
      })
    });
    
    const result = await response.json();
    console.log('Test completion result:', result);
    
    if (result.success) {
      console.log('✅ Session completion test passed!');
    } else {
      console.log('❌ Session completion test failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing session completion:', error);
  }
}

// Test 3: Check AuthContext (if available)
console.log('\n3. Checking AuthContext...');
try {
  // This will only work if you're in a React component context
  console.log('AuthContext check - this requires React context');
} catch (error) {
  console.log('AuthContext not available in this context');
}

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure you are logged in and on the sessions page');
console.log('2. Start an instant session');
console.log('3. In the browser console, run: testSessionCompletion()');
console.log('4. Check the backend logs for the request data');

// Export the test function for manual testing
window.testSessionCompletion = testSessionCompletion;
