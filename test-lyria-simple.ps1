# Simple PowerShell test script for Lyria Music Generation
# Tests the Lyria 2 API integration

Write-Host "`n🎵 ========================================" -ForegroundColor Cyan
Write-Host "🎵 TESTING LYRIA MUSIC GENERATION" -ForegroundColor Cyan
Write-Host "🎵 ========================================`n" -ForegroundColor Cyan

# Generate a unique test user ID
$TEST_UID = "test-user-lyria-$(Get-Date -UFormat %s)"
$API_URL = "http://localhost:5000"

# Step 1: Create test user
Write-Host "Step 1: Creating test user..." -ForegroundColor Yellow
$createUserBody = @{
    firebaseUid = $TEST_UID
} | ConvertTo-Json

try {
    $createUserResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/create-user" `
        -Method POST `
        -ContentType "application/json" `
        -Body $createUserBody

    Write-Host "✅ Test user created with secret code: $($createUserResponse.user.secretCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create user: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Add mood
Write-Host "`nStep 2: Adding mood check-in..." -ForegroundColor Yellow
$moodBody = @{
    mood = "calm"
    note = "Testing Lyria"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$API_URL/api/auth/user/$TEST_UID/mood" `
        -Method POST `
        -ContentType "application/json" `
        -Body $moodBody | Out-Null
    
    Write-Host "✅ Mood added: calm" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Warning: Could not add mood" -ForegroundColor Yellow
}

# Step 3: Start instant session
Write-Host "`nStep 3: Starting instant session..." -ForegroundColor Yellow
Write-Host "⏳ This may take 30-60 seconds...`n" -ForegroundColor Cyan

$sessionBody = @{
    firebaseUid = $TEST_UID
    userContext = @{
        nickname = "Test User"
        mood = "calm"
    }
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "$API_URL/api/sessions/start-instant" `
        -Method POST `
        -ContentType "application/json" `
        -Body $sessionBody `
        -TimeoutSec 120

    # Check for background music
    Write-Host "`n🎵 ========================================" -ForegroundColor Cyan
    Write-Host "🎵 MUSIC GENERATION RESULTS" -ForegroundColor Cyan
    Write-Host "🎵 ========================================" -ForegroundColor Cyan

    if ($sessionResponse.session.backgroundMusic) {
        Write-Host "✅ Background music: GENERATED" -ForegroundColor Green
        Write-Host "📏 Music data length: $($sessionResponse.session.backgroundMusic.Length) characters" -ForegroundColor White
        Write-Host "🎵 Music generated with: $($sessionResponse.session.musicGeneratedWith)" -ForegroundColor White
        
        if ($sessionResponse.session.backgroundMusic -match "^data:audio/wav;base64,") {
            Write-Host "✅ Music format: Valid WAV data URL" -ForegroundColor Green
            
            # Calculate approximate file size
            $base64Data = $sessionResponse.session.backgroundMusic -replace "^data:audio/wav;base64,", ""
            $approxSizeKB = [Math]::Round(($base64Data.Length * 3/4) / 1024, 2)
            Write-Host "📦 Approximate audio file size: $approxSizeKB KB" -ForegroundColor White
        }
        
        Write-Host "`n🎉 LYRIA MUSIC GENERATION TEST: PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ Background music: NOT GENERATED" -ForegroundColor Red
        Write-Host "`nℹ️ This might be expected if:" -ForegroundColor Yellow
        Write-Host "   - Lyria API is not available in your region" -ForegroundColor Yellow
        Write-Host "   - API quota exceeded" -ForegroundColor Yellow
        Write-Host "   - Service account lacks permissions" -ForegroundColor Yellow
        Write-Host "   - Model lyria-002 not found" -ForegroundColor Yellow
        Write-Host "`n⚠️ LYRIA MUSIC GENERATION TEST: FAILED (no music generated)" -ForegroundColor Red
    }

    # Show background image status
    Write-Host "`n🎨 ========================================" -ForegroundColor Cyan
    Write-Host "🎨 BACKGROUND IMAGE RESULTS" -ForegroundColor Cyan
    Write-Host "🎨 ========================================" -ForegroundColor Cyan
    
    if ($sessionResponse.session.backgroundImage) {
        if ($sessionResponse.session.backgroundImage -match "^data:image/") {
            Write-Host "✅ Background image: GENERATED (Imagen 3)" -ForegroundColor Green
            Write-Host "🖼️ Generated with: $($sessionResponse.session.generatedWith)" -ForegroundColor White
        } else {
            Write-Host "✅ Background: Mood-based gradient fallback" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ No background image" -ForegroundColor Yellow
    }

} catch {
    Write-Host "`n❌ TEST FAILED" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Message -match "Connection refused") {
        Write-Host "`n⚠️ Backend server is not running!" -ForegroundColor Yellow
        Write-Host "Start it with: cd backend && npm run dev" -ForegroundColor Cyan
    }
    
    exit 1
}

Write-Host "`n🎵 ========================================" -ForegroundColor Cyan
Write-Host "🎵 TEST COMPLETE" -ForegroundColor Cyan
Write-Host "🎵 ========================================`n" -ForegroundColor Cyan

