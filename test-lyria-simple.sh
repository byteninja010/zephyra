#!/bin/bash

# Simple test script for Lyria Music Generation
# Tests the Lyria 2 API integration using curl

echo ""
echo "🎵 ========================================"
echo "🎵 TESTING LYRIA MUSIC GENERATION"
echo "🎵 ========================================"
echo ""

# Generate a unique test user ID
TEST_UID="test-user-lyria-$(date +%s)"
API_URL="http://localhost:5000"

# Step 1: Create test user
echo "Step 1: Creating test user..."
CREATE_USER=$(curl -s -X POST "$API_URL/api/auth/create-user" \
  -H "Content-Type: application/json" \
  -d "{\"firebaseUid\":\"$TEST_UID\"}")

SECRET_CODE=$(echo $CREATE_USER | grep -o '"secretCode":"[^"]*"' | cut -d'"' -f4)
echo "✅ Test user created with secret code: $SECRET_CODE"

# Step 2: Add mood
echo ""
echo "Step 2: Adding mood check-in..."
curl -s -X POST "$API_URL/api/auth/user/$TEST_UID/mood" \
  -H "Content-Type: application/json" \
  -d '{"mood":"calm","note":"Testing Lyria"}' > /dev/null
echo "✅ Mood added: calm"

# Step 3: Start instant session
echo ""
echo "Step 3: Starting instant session..."
echo "⏳ This may take 30-60 seconds..."
echo ""

SESSION_RESPONSE=$(curl -s -X POST "$API_URL/api/sessions/start-instant" \
  -H "Content-Type: application/json" \
  -d "{\"firebaseUid\":\"$TEST_UID\",\"userContext\":{\"nickname\":\"Test User\",\"mood\":\"calm\"}}")

# Check for background music
echo ""
echo "🎵 ========================================"
echo "🎵 MUSIC GENERATION RESULTS"
echo "🎵 ========================================"

if echo "$SESSION_RESPONSE" | grep -q "backgroundMusic"; then
  echo "✅ Background music: GENERATED"
  
  # Extract music length
  MUSIC_LENGTH=$(echo "$SESSION_RESPONSE" | grep -o '"backgroundMusic":"[^"]*"' | wc -c)
  echo "📏 Music data length: ~$MUSIC_LENGTH characters"
  
  # Extract generator name
  GENERATOR=$(echo "$SESSION_RESPONSE" | grep -o '"musicGeneratedWith":"[^"]*"' | cut -d'"' -f4)
  echo "🎵 Music generated with: $GENERATOR"
  
  # Check if it's a valid data URL
  if echo "$SESSION_RESPONSE" | grep -q "data:audio/wav;base64,"; then
    echo "✅ Music format: Valid WAV data URL"
  fi
  
  echo ""
  echo "🎉 LYRIA MUSIC GENERATION TEST: PASSED"
else
  echo "❌ Background music: NOT GENERATED"
  echo ""
  echo "ℹ️ This might be expected if:"
  echo "   - Lyria API is not available in your region"
  echo "   - API quota exceeded"
  echo "   - Service account lacks permissions"
  echo "   - Model lyria-002 not found"
  echo ""
  echo "⚠️ LYRIA MUSIC GENERATION TEST: FAILED"
fi

echo ""
echo "🎵 ========================================"
echo "🎵 TEST COMPLETE"
echo "🎵 ========================================"
echo ""

# Show full response for debugging
echo "Full response (first 500 chars):"
echo "$SESSION_RESPONSE" | cut -c1-500
echo "..."

