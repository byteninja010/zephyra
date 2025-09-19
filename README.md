# Zephyra - AI-Powered Mental Wellness Platform

A comprehensive mental health and wellness platform built with the MERN stack, featuring AI-powered conversations, session management, mood tracking, and personalized wellness support using Google's Gemini AI.

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🏗️ System Architecture](#️-system-architecture)
- [📁 Project Structure](#-project-structure)
- [🔧 API Endpoints](#-api-endpoints)
- [🎨 Key Components](#-key-components)
- [🛠️ Technology Stack](#️-technology-stack)
- [🔒 Security Features](#-security-features)
- [📱 Usage](#-usage)
- [🔧 Troubleshooting](#-troubleshooting)
- [📝 Scripts](#-scripts)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 Features

### 🤖 AI-Powered Chat System
- **Intelligent Conversations**: Powered by Google Gemini 2.5 Flash AI
- **Voice & Text Support**: Audio-to-audio and text-to-text conversations
- **Language Support**: Multi-language support including Hindi and English
- **Contextual Responses**: Personalized based on user profile and conversation history
- **Mental Wellness Focus**: Specialized AI trained for mental health support

### 🧠 Session Management
- **Scheduled Sessions**: Create daily, weekly, or monthly wellness sessions
- **Instant Sessions**: Start immediate wellness conversations
- **Session Tracking**: Monitor session history and progress
- **Personalized Greetings**: AI-generated contextual session openings
- **Session Summaries**: Automatic generation of detailed session summaries

### 📊 Mood & Wellness Tracking
- **Mood Check-ins**: Track daily mood and emotional state
- **Mood Visualization**: Interactive mood graphs and charts
- **Reflection Tools**: Guided reflection exercises and insights
- **Streak Tracking**: Monitor wellness activity streaks
- **Progress Analytics**: View long-term wellness trends

### 🎯 Personalized Experience
- **User Profiles**: Customizable user profiles with wellness goals
- **Onboarding Flow**: Guided setup for new users
- **Secret Code System**: Secure user identification
- **Cumulative Summaries**: AI-generated comprehensive wellness summaries
- **Adaptive Support**: AI that learns from user interactions
- **Personalized Quotes**: AI-generated motivational quotes based on user context
- **Activity Tracking**: Monitor user engagement and wellness activities
- **Reflection Management**: Store and manage user reflections and insights

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop and mobile devices
- **TailwindCSS**: Modern, clean styling
- **Framer Motion**: Smooth animations and transitions
- **Heroicons**: Beautiful icon system
- **Gradient Backgrounds**: Personalized session backgrounds

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Firebase project with Anonymous Authentication enabled
- Google Gemini API key
- Google Cloud Speech & Text-to-Speech APIs

### Installation

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd Zephyra-AI/zephyra
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure Environment Variables:**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   ```

5. **Update `backend/.env` with your credentials:**
   ```env
   # MongoDB Connection
   MONGO_URI=mongodb://localhost:27017/zephyra

   # Server Configuration
   PORT=5000

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # Google Cloud Credentials (for Speech-to-Text and Text-to-Speech)
   # Download your service account key file from Google Cloud Console
   # and place it in the backend directory as 'google-credentials.json'
   GOOGLE_APPLICATION_CREDENTIALS=google-credentials.json

   # Frontend URL (for CORS)
   REACT_APP_API_URL=http://localhost:5000

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your_project_id",...}
   ```

6. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Anonymous Authentication
   - Copy your Firebase config to `frontend/src/firebase.js`

7. **Setup Google Cloud APIs:**
   - Enable Cloud Speech-to-Text API
   - Enable Cloud Text-to-Speech API
   - Create service account and download credentials
   - Place `google-credentials.json` in the `backend/` directory

### Running the Application

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Server will run on http://localhost:5000

**Frontend (Terminal 2):**
```bash
cd frontend
npm start
```
App will run on http://localhost:3000

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Express API   │    │ • Google Gemini │
│ • Chat UI       │    │ • Auth Routes   │    │ • Speech APIs   │
│ • Session UI    │    │ • Chat Routes   │    │ • Firebase      │
│ • Mood Tracking │    │ • Session Routes│    │ • MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Architecture
```
User Input → Frontend → Backend API → AI Processing → Database → Response
     ↓           ↓           ↓            ↓            ↓         ↓
  Text/Voice → React → Express → Gemini AI → MongoDB → JSON → UI Update
```

### Component Architecture
```
Frontend (React)
├── Authentication Layer
│   ├── AuthContext
│   ├── AuthPage
│   └── SecretCodeModal
├── Core Features
│   ├── Dashboard (Main Navigation)
│   ├── ChatInterface (AI Conversations)
│   ├── SessionInterface (Wellness Sessions)
│   └── MoodCheckInModal (Mood Tracking)
├── Supporting Components
│   ├── BreathingExercise
│   ├── StreakTracker
│   ├── MoodGraph
│   └── ReflectionChart
└── Services
    ├── authService
    └── sessionService

Backend (Node.js/Express)
├── API Layer
│   ├── /api/auth (Authentication)
│   ├── /api/chat (AI Conversations)
│   └── /api/sessions (Wellness Sessions)
├── Business Logic
│   ├── AI Integration (Gemini)
│   ├── Audio Processing (Speech APIs)
│   └── Session Management
├── Data Layer
│   ├── User Model
│   ├── Chat Model
│   └── Session Model
└── External Integrations
    ├── Google Gemini AI
    ├── Google Cloud Speech
    └── Firebase Authentication
```

## 📁 Project Structure

```
Zephyra/
├─ backend/
│  ├─ models/              # MongoDB models (User, Chat, Session)
│  ├─ routes/              # API routes (auth, chat, sessions)
│  ├─ services/            # Business logic services
│  ├─ config/              # Firebase configuration
│  ├─ uploads/             # Audio file storage
│  ├─ server.js            # Express server
│  ├─ .env                 # Environment variables
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ components/       # React components
│  │  │  ├─ AuthPage.js
│  │  │  ├─ ChatInterface.js
│  │  │  ├─ Dashboard.js
│  │  │  ├─ SessionInterface.js
│  │  │  ├─ MoodCheckInModal.js
│  │  │  ├─ BreathingExercise.js
│  │  │  └─ ... (15+ components)
│  │  ├─ contexts/         # React contexts
│  │  ├─ hooks/            # Custom React hooks
│  │  ├─ services/         # API services
│  │  ├─ firebase.js       # Firebase configuration
│  │  └─ App.js            # Main app component
│  ├─ public/              # Static assets
│  ├─ tailwind.config.js   # TailwindCSS configuration
│  └─ package.json
├─ CHAT_SETUP.md           # Detailed chat setup guide
└─ README.md
```

### Database Schema
```
MongoDB Collections:
├── users
│   ├── firebaseUid (String, Unique, Indexed)
│   ├── secretCode (String, Unique, Indexed)
│   ├── nickname (String)
│   ├── ageRange (String, Enum: 13-17, 18-25, 26-35, 36-50, 51+)
│   ├── goals (Array of Strings)
│   ├── preferredSupport (Array of Strings)
│   ├── moodHistory (Array of Objects)
│   │   ├── mood (String, Required)
│   │   ├── note (String)
│   │   └── date (Date, Default: Date.now)
│   ├── reflections (Array of Objects)
│   │   ├── text (String, Required)
│   │   ├── mood (String, Required)
│   │   ├── category (String, Required)
│   │   └── date (Date, Default: Date.now)
│   ├── activityHistory (Array of Objects)
│   │   ├── type (String, Required)
│   │   └── date (Date, Default: Date.now)
│   ├── lastLogin (Date)
│   ├── isActive (Boolean, Default: true)
│   └── createdAt (Date, Default: Date.now)
├── chats
│   ├── firebaseUid (String, Required)
│   ├── sessionId (String, Optional)
│   ├── title (String, Required)
│   ├── messages (Array of Message Objects)
│   │   ├── text (String, Required)
│   │   ├── sender (String, Enum: user, ai)
│   │   ├── messageType (String, Enum: text, audio)
│   │   ├── audioUrl (String, Optional)
│   │   └── timestamp (Date, Default: Date.now)
│   ├── context (Object, Optional)
│   ├── isActive (Boolean, Default: true)
│   ├── createdAt (Date, Default: Date.now)
│   └── updatedAt (Date, Default: Date.now)
└── sessions
    ├── firebaseUid (String, Required, Indexed)
    ├── sessionId (String, Required, Unique)
    ├── schedule (Object)
    │   ├── frequency (String, Enum: daily, weekly, monthly)
    │   ├── time (String, Required, Format: HH:MM)
    │   ├── days (Array of Strings, Enum: monday-sunday)
    │   └── timezone (String, Default: UTC)
    ├── status (String, Enum: scheduled, active, completed, cancelled, missed)
    ├── sessionData (Object)
    │   ├── backgroundImage (String, Optional)
    │   ├── backgroundPrompt (String, Optional)
    │   ├── greeting (String, Optional)
    │   ├── moodCheckIn (Object, Optional)
    │   ├── exploration (Array of Objects)
    │   ├── copingTool (Object, Optional)
    │   ├── reflection (Object, Optional)
    │   └── closure (Object, Optional)
    ├── nextSessionDate (Date, Required)
    ├── lastSessionSummary (String, Optional)
    ├── completedAt (Date, Optional)
    ├── createdAt (Date, Default: Date.now)
    └── updatedAt (Date, Default: Date.now)
```

## 🔧 API Endpoints

### Authentication & User Management
- `POST /api/auth/create-user` - Create new user with secret code
- `POST /api/auth/validate-secret-code` - Validate user secret code
- `GET /api/auth/user/:firebaseUid` - Get user profile
- `PUT /api/auth/user/:firebaseUid/last-login` - Update last login
- `PUT /api/auth/user/:firebaseUid/onboarding` - Complete user onboarding
- `POST /api/auth/user/:firebaseUid/mood` - Add mood entry
- `POST /api/auth/user/:firebaseUid/reflection` - Add reflection entry
- `POST /api/auth/user/:firebaseUid/activity` - Add activity entry
- `GET /api/auth/user/:firebaseUid/reflections` - Get user reflections
- `GET /api/auth/user/:firebaseUid/activities` - Get user activities
- `GET /api/auth/user/:firebaseUid/personalized-quote` - Get personalized quote

### Chat System
- `POST /api/chat/create` - Create new chat
- `GET /api/chat/history/:firebaseUid` - Get chat history
- `GET /api/chat/:chatId` - Get specific chat
- `PUT /api/chat/:chatId` - Update chat title
- `POST /api/chat/:chatId/message` - Send text message
- `POST /api/chat/:chatId/audio` - Send audio message
- `DELETE /api/chat/:chatId` - Delete chat

### Session Management
- `POST /api/sessions/create` - Create session schedule
- `POST /api/sessions/start-instant` - Start instant session
- `GET /api/sessions/schedule/:firebaseUid` - Get session schedule
- `GET /api/sessions/upcoming/:firebaseUid` - Get upcoming sessions
- `POST /api/sessions/start/:sessionId` - Start scheduled session
- `POST /api/sessions/update/:sessionId` - Update session data
- `POST /api/sessions/complete/:sessionId` - Complete session
- `GET /api/sessions/history/:firebaseUid` - Get session history
- `DELETE /api/sessions/cancel/:sessionId` - Cancel session
- `DELETE /api/sessions/cleanup/:firebaseUid` - Clean up duplicate sessions

## 🎨 Key Components

### Frontend Components
- **AuthPage**: User authentication and login interface
- **Dashboard**: Main user interface with navigation and overview
- **ChatInterface**: AI conversation interface with voice support
- **SessionInterface**: Dedicated wellness session interface
- **SimpleSessionInterface**: Simplified session interface
- **SessionsPage**: Session management and scheduling page
- **SessionScheduling**: Session creation and scheduling component
- **MoodCheckInModal**: Mood tracking and reflection modal
- **MoodGraph**: Mood visualization and analytics charts
- **BreathingExercise**: Guided breathing exercises
- **OnboardingFlow**: User setup and profile creation
- **StreakTracker**: Wellness activity streak tracking
- **ReflectionChart**: Reflection data visualization
- **HeroSection**: Landing page hero section
- **SecretCodeModal**: Secret code validation modal

### Backend Models
- **User**: User profiles, mood history, reflections
- **Chat**: Conversation history and context
- **Session**: Wellness session management and data

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM (v8.18.1)
- **Google Gemini AI** (@google/genai v1.19.0) for intelligent conversations
- **Google Cloud Speech-to-Text** (@google-cloud/speech v7.2.0) for audio transcription
- **Google Cloud Text-to-Speech** for audio responses
- **Firebase Admin** (v12.7.0) for authentication
- **Multer** (v2.0.2) for file uploads
- **CORS** (v2.8.5) for cross-origin requests
- **Axios** (v1.12.2) for HTTP requests

### Frontend
- **React 19.1.1** with modern hooks
- **React DOM 19.1.1** for rendering
- **TailwindCSS** (v3.4.0) for styling
- **Framer Motion** (v12.23.13) for animations
- **Firebase** (v12.2.1) for authentication
- **Axios** (v1.12.2) for API calls
- **React Router DOM** (v7.9.1) for navigation
- **Heroicons** (@heroicons/react v2.2.0) for icons
- **React Scripts** (v5.0.1) for build tools

## 🔒 Security Features

- **Firebase Anonymous Authentication** for privacy
- **CORS** enabled for cross-origin requests
- **Environment variables** for sensitive data
- **Secure MongoDB** connections
- **API key protection** and rotation
- **File upload validation** and size limits

## 📱 Usage

### Starting a Chat
1. Navigate to the chat interface
2. Choose between text or voice mode
3. Start conversing with Zephyra AI
4. AI responds with personalized, supportive messages

### Scheduling Sessions
1. Go to the Sessions page
2. Set your preferred frequency (daily, weekly, monthly)
3. Choose your preferred time
4. Sessions will be automatically scheduled

### Mood Tracking
1. Use the mood check-in feature
2. Record your current emotional state
3. Add notes about your feelings
4. View your mood history and trends

### Getting Personalized Quotes
1. Navigate to the dashboard
2. The system automatically generates personalized motivational quotes
3. Quotes are based on your mood history and wellness goals
4. Refresh to get new quotes anytime

### Managing Reflections
1. Use the reflection tools during sessions
2. Add personal insights and thoughts
3. View your reflection history
4. Track your personal growth over time

## 🚀 Current Status

The platform currently includes:
- **AI-powered chat system** with voice and text support
- **Session management** with scheduling and instant sessions
- **Mood tracking** and reflection tools
- **User authentication** and profile management
- **Personalized AI responses** based on user context
- **Audio processing** with speech-to-text and text-to-speech

## 🔮 Future Development

Potential areas for expansion:
- Enhanced mobile responsiveness
- Additional wellness tools and exercises
- More detailed analytics and reporting
- Integration with external wellness services

## 📝 Scripts

### Backend
- `npm run dev` - Start development server with nodemon (auto-restart on changes)
- `npm start` - Start production server

### Frontend
- `npm start` - Start development server (default React script)
- `npm run dev` - Start development server (alternative script)
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App (irreversible)

## 🔧 Troubleshooting

### Common Issues

1. **Audio not working**
   - Check microphone permissions in browser
   - Ensure Google Cloud Speech API is enabled
   - Verify `google-credentials.json` is in backend directory

2. **API errors**
   - Verify all API keys are correct in `.env` file
   - Check Google Cloud API quotas and billing
   - Ensure MongoDB is running and accessible

3. **CORS issues**
   - Verify `REACT_APP_API_URL` in backend `.env`
   - Check frontend is running on correct port (3000)
   - Ensure backend is running on correct port (5000)

4. **Firebase authentication errors**
   - Verify Firebase project configuration
   - Check Anonymous Authentication is enabled
   - Ensure Firebase config is correct in `frontend/src/firebase.js`

5. **Database connection issues**
   - Verify MongoDB connection string
   - Check if MongoDB service is running
   - Ensure database name matches in connection string

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your backend `.env` file.

### Getting Help
- Check console logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure all dependencies are installed with `npm install`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## ©️ Copyright

Copyright © 2025 Oblivians. All rights reserved.

## 🙏 Acknowledgments

Special thanks to **Google Technologies** for making this project possible:

- **Google Gemini AI** - For providing the intelligent conversation capabilities and mental wellness support
- **Google Cloud Speech-to-Text API** - For enabling voice input and audio transcription
- **Google Cloud Text-to-Speech API** - For generating high-quality audio responses
- **Firebase** - For secure authentication and user management
- **Google AI Studio** - For easy access to Gemini AI models

This project leverages Google's cutting-edge AI and cloud technologies to create a comprehensive mental wellness platform that helps users on their journey to better mental health.

---

**Ready to transform mental wellness with AI! 🧠💙**

For detailed setup instructions, see [CHAT_SETUP.md](CHAT_SETUP.md)