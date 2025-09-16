# Zephyra Chat Setup Guide

## Overview
The Zephyra mental wellness chatbot provides both text and audio conversation capabilities using Google's Gemini AI, Speech-to-Text, and Text-to-Speech APIs.

## Features
- **Text-to-Text Chat**: Traditional text-based conversations
- **Audio-to-Audio Chat**: Voice conversations with automatic transcription and speech synthesis
- **Mental Wellness Focus**: AI is specifically trained for mental health support and motivation
- **User Context**: Personalized responses based on user profile and mood history
- **Chat History**: Save and continue previous conversations
- **Topic Boundaries**: AI redirects conversations back to mental wellness topics

## Setup Instructions

### 1. Backend Environment Setup

1. Copy the environment template:
   ```bash
   cp backend/env.example backend/.env
   ```

2. Update `backend/.env` with your API keys:
   ```env
   # MongoDB Connection
   MONGO_URI=mongodb://localhost:27017/zephyra

   # Server Configuration
   PORT=5000

   # Google Gemini API Key
   GEMINI_API_KEY=your_actual_gemini_api_key_here

   # Google Cloud Credentials (for Speech-to-Text and Text-to-Speech)
   GOOGLE_APPLICATION_CREDENTIALS=google-credentials.json
   ```

### 2. Google API Setup

#### Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

#### Google Cloud Speech & Text-to-Speech APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Create Service Account
   - Download the JSON key file
   - Rename it to `google-credentials.json`
   - Place it in the `backend/` directory

### 3. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 4. Start the Application

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

## Chat Interface Features

### Text Mode
- Type messages in the input field
- Press Enter or click Send
- AI responds with text

### Audio Mode
- Toggle audio mode with the speaker icon
- Click and hold the microphone to record
- Release to send audio message
- AI responds with both text and audio

### Chat Management
- **New Chat**: Start a fresh conversation
- **Chat History**: View and continue previous chats
- **Delete Chat**: Remove unwanted conversations

## AI Personality & Capabilities

The AI (Zephyra) is designed as a mental wellness companion with:

- **Empathetic & Supportive**: Always responds with care and understanding
- **Mental Health Focus**: Specialized in depression, anxiety, motivation, and wellness
- **Topic Boundaries**: Redirects non-wellness topics back to mental health
- **Personalized**: Uses user context from mood history and profile
- **Safety Protocols**: Handles crisis situations appropriately

## API Endpoints

### Chat Management
- `POST /api/chat/create` - Create new chat
- `GET /api/chat/history/:firebaseUid` - Get chat history
- `GET /api/chat/:chatId` - Get specific chat
- `DELETE /api/chat/:chatId` - Delete chat

### Messaging
- `POST /api/chat/:chatId/message` - Send text message
- `POST /api/chat/:chatId/audio` - Send audio message

## Troubleshooting

### Common Issues

1. **Audio not working**: Check microphone permissions in browser
2. **API errors**: Verify API keys are correct and have proper permissions
3. **CORS issues**: Ensure frontend URL is configured in backend
4. **File upload errors**: Check uploads directory permissions

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your `.env` file.

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Regularly rotate API keys
- Monitor API usage and costs

## Support

For issues or questions about the chat functionality, check the console logs and ensure all API keys are properly configured.
