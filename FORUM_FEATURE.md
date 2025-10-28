# 🛡️ AI-Moderated Anonymous Discussion Forum

## Overview

An anonymous, real-time discussion forum with AI-powered content moderation using Gemini 2.5 Flash. Users can share mental health experiences, struggles, and support each other in a safe, protected environment.

---

## 🎯 Core Features

### 1. **Anonymous Identity System**
- **Server-assigned pseudonyms**: Format `AdjectiveNoun##` (e.g., `GentleFalcon42`)
- Tied to user's secret code for persistence
- No personal data collection or exposure
- Pseudonym auto-generated on first forum access

### 2. **Real-Time Communication**
- **Socket.IO** for instant updates
- New posts appear immediately for all users
- Comments update in real-time
- Sub-second response time

### 3. **AI Content Moderation**
- **Gemini 2.5 Flash** reviews every post/comment before publication
- Binary decision: `accept` or `reject`
- Response time: typically <1 second

### 4. **Moderation Philosophy**
#### ✅ **ACCEPT (Welcome Content)**
- Mental health discussions (depression, anxiety, etc.)
- Emotional vulnerability and distress
- Help-seeking behavior
- Personal experiences and struggles
- Sensitive topics handled respectfully
- Casual language and emotional expression

#### ❌ **REJECT (Safety Filters)**
- Active promotion of self-harm or suicide
- Hate speech or harassment
- Personal identifiable information (PII)
- Spam or advertising
- Threats or violence
- Deliberate trolling

---

## 🏗️ System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER SUBMITS                         │
│                    (Post or Comment)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SOCKET.IO SERVER                          │
│              (Receives submission event)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   GEMINI 2.5 FLASH                           │
│            (AI Content Moderation Service)                   │
│                                                              │
│  • Analyzes content intent and safety                        │
│  • Returns: { verdict: "accept/reject", reason: "..." }      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐       ┌──────────────┐
        │   ACCEPT     │       │   REJECT     │
        └──────┬───────┘       └──────┬───────┘
               │                      │
               ▼                      ▼
    ┌─────────────────┐    ┌────────────────────┐
    │  Save to DB     │    │ Private Notify     │
    │  (MongoDB)      │    │ (Socket emit to    │
    └────────┬────────┘    │  sender only)      │
             │              └────────────────────┘
             ▼
    ┌─────────────────┐
    │ Broadcast to    │
    │ All Users       │
    │ (Socket.IO)     │
    └─────────────────┘
```

### Component Architecture

#### **Backend Components**

1. **Models** (`backend/models/`)
   - `ForumPost.js` - Post and comment schema
   - `User.js` - Updated with pseudonym field

2. **Services** (`backend/services/`)
   - `moderationService.js` - Gemini AI moderation logic
   
3. **Utilities** (`backend/utils/`)
   - `pseudonymGenerator.js` - Anonymous identity generation

4. **Routes** (`backend/routes/`)
   - `forum.js` - REST API endpoints (fallback)

5. **Socket Handlers** (`backend/socket/`)
   - `forumHandlers.js` - Real-time event management

6. **Server** (`backend/server.js`)
   - Socket.IO integration with Express

#### **Frontend Components**

1. **Components** (`frontend/src/components/`)
   - `Forum.js` - Main forum interface

2. **Services** (`frontend/src/services/`)
   - `socketService.js` - Socket.IO client wrapper

3. **Routes** (`frontend/src/App.js`)
   - Added `/forum` route

---

## 🔄 Event Flow

### Post Submission Flow

```javascript
// 1. User submits post
User clicks "Share Post"
  ↓
// 2. Frontend emits event
socketService.submitPost(firebaseUid, content)
  ↓
// 3. Backend receives via Socket.IO
socket.on('submit_post', async (data) => { ... })
  ↓
// 4. AI Moderation
moderateContent(content, 'post')
  ↓
// 5a. If ACCEPTED
- Save to database
- Emit 'new_post' to all users (broadcast)
- Emit 'post_accepted' to sender
  ↓
// 5b. If REJECTED
- Emit 'post_rejected' to sender only (with reason)
```

### Comment Submission Flow

```javascript
// Similar flow as posts
socket.on('submit_comment', async (data) => { ... })
  ↓
moderateContent(content, 'comment')
  ↓
// If accepted: broadcast 'new_comment'
// If rejected: private 'comment_rejected'
```

### Real-Time Updates

```javascript
// All connected clients listen for:
socket.on('new_post', (data) => {
  // Add post to local state
  // UI updates instantly
})

socket.on('new_comment', (data) => {
  // Add comment to specific post
  // UI updates instantly
})
```

---

## 🛠️ Technical Implementation

### Backend Setup

#### 1. Dependencies
```json
{
  "socket.io": "^4.x",
  "@google/genai": "^1.x"
}
```

#### 2. Socket.IO Server Initialization
```javascript
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://your-app.com'],
    credentials: true
  }
});
```

#### 3. Moderation Service
```javascript
const moderateContent = async (content, contentType) => {
  // Call Gemini 2.5 Flash
  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: moderationPrompt,
    generationConfig: { temperature: 0.1 }
  });
  
  // Parse JSON response
  return { verdict: "accept", reason: "..." };
};
```

### Frontend Setup

#### 1. Dependencies
```json
{
  "socket.io-client": "^4.x"
}
```

#### 2. Socket Service
```javascript
import { io } from 'socket.io-client';

class SocketService {
  connect() {
    this.socket = io(API_BASE_URL);
  }
  
  submitPost(firebaseUid, content) {
    this.socket.emit('submit_post', { firebaseUid, content });
  }
  
  onNewPost(callback) {
    this.socket.on('new_post', callback);
  }
}
```

---

## 📊 Database Schema

### ForumPost Model
```javascript
{
  postId: String (unique),
  firebaseUid: String,
  pseudonym: String,
  content: String (max 2000 chars),
  comments: [{
    commentId: String,
    firebaseUid: String,
    pseudonym: String,
    content: String (max 1000 chars),
    createdAt: Date
  }],
  commentCount: Number,
  isActive: Boolean,
  isModerated: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### User Model (Updated)
```javascript
{
  // Existing fields...
  pseudonym: String (unique, sparse index)
}
```

---

## 🚀 Usage Guide

### For Users

1. **Access Forum**: Navigate to Dashboard → Click "Join Community" on Support Forum card
2. **View Identity**: Your pseudonym appears in the header (e.g., "GentleFalcon42")
3. **Create Post**: Type in text area → Click "Share Post" → Wait for AI moderation
4. **Add Comment**: Click post comment count → Type comment → Click "Comment"
5. **Real-Time Updates**: New posts/comments appear automatically

### Notifications

- ✅ **Post Accepted**: "Your post has been published!"
- ❌ **Post Rejected**: Shows reason (e.g., "Content contains personal information")
- 💬 **New Content**: Appears instantly without page reload

---

## 🔒 Safety Features

1. **AI Gatekeeper**: Every piece of content reviewed before publication
2. **Fail-Safe**: If AI service is down, defaults to accepting (to keep forum functional)
3. **Retry Logic**: 3 retries with exponential backoff for AI calls
4. **Private Feedback**: Rejection reasons sent only to author
5. **No PII Collection**: Completely anonymous discussions

---

## ⚡ Performance Characteristics

- **Moderation Response**: < 1 second (typically 200-500ms)
- **Real-Time Latency**: < 100ms for socket broadcasts
- **Scalability**: Socket.IO rooms enable horizontal scaling
- **Database Queries**: Indexed for fast retrieval

---

## 🎨 UI/UX Principles

1. **Warm & Empathetic**: Soft colors, gentle language
2. **Non-Restrictive**: AI protection feels invisible
3. **Instant Feedback**: Real-time updates create engagement
4. **Clear Identity**: Pseudonym always visible for trust
5. **Safe Space Messaging**: Explicit "AI-Moderated Safe Space" banner

---

## 🧪 Testing

### Manual Testing Flow

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Open two browser windows (different users)
4. Submit post in Window 1 → See it appear in Window 2
5. Test rejections: Submit post with fake email or PII

### Test Cases

| Test | Expected Behavior |
|------|-------------------|
| Post mental health struggle | ✅ Accepted |
| Post with email address | ❌ Rejected (PII) |
| Comment with support message | ✅ Accepted |
| Comment with hate speech | ❌ Rejected |
| Real-time broadcast | Both users see new post instantly |
| Pseudonym generation | Unique format like "GentleOtter42" |

---

## 🔮 Future Enhancements

### Potential Features
- 📌 Pin important posts (moderator feature)
- 🏷️ Tag/categorize posts by topic
- 🔍 Search functionality
- 👍 Upvote/support reactions
- 📊 Moderation analytics dashboard
- 🤖 More sophisticated AI patterns (sentiment analysis)
- 📱 Push notifications for replies
- 🌐 Multi-language support

---

## 📝 API Reference

### REST Endpoints (Fallback)

```http
GET    /api/forum/posts              - Get all posts (paginated)
GET    /api/forum/posts/:postId      - Get post with comments
POST   /api/forum/posts              - Create post (with moderation)
POST   /api/forum/posts/:postId/comments  - Add comment (with moderation)
DELETE /api/forum/posts/:postId      - Delete own post
GET    /api/forum/pseudonym/:firebaseUid  - Get/create pseudonym
```

### Socket.IO Events

#### Client → Server
- `submit_post` - Submit new post for moderation
- `submit_comment` - Submit new comment for moderation

#### Server → Client (Broadcast)
- `new_post` - New post accepted and published
- `new_comment` - New comment accepted and published

#### Server → Client (Private)
- `post_accepted` - Your post was published
- `post_rejected` - Your post was rejected (with reason)
- `comment_accepted` - Your comment was published
- `comment_rejected` - Your comment was rejected (with reason)
- `post_error` - Error processing post
- `comment_error` - Error processing comment

---

## 🛡️ Security Considerations

1. **No Authentication on Socket**: Uses firebaseUid for identity (already authenticated)
2. **Rate Limiting**: Consider implementing to prevent spam
3. **Content Length Limits**: Posts (2000 chars), Comments (1000 chars)
4. **CORS**: Configured for specific origins only
5. **Input Sanitization**: HTML/XSS prevention in frontend

---

## 📖 Code Examples

### Submit Post (Frontend)
```javascript
const handleSubmitPost = () => {
  socketService.submitPost(firebaseUid, newPostContent);
};
```

### Listen for New Posts (Frontend)
```javascript
socketService.onNewPost((data) => {
  setPosts(prev => [data, ...prev]);
});
```

### Moderate Content (Backend)
```javascript
const result = await moderateContent(content, 'post');
if (result.verdict === 'accept') {
  await post.save();
  io.to('forum').emit('new_post', postData);
} else {
  socket.emit('post_rejected', { reason: result.reason });
}
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Socket not connecting**
   - Check CORS configuration
   - Verify Socket.IO server is running
   - Check browser console for connection errors

2. **Posts not appearing**
   - Check Socket.IO connection status
   - Verify event listeners are set up
   - Check backend logs for moderation errors

3. **Moderation always rejecting**
   - Verify GEMINI_API_KEY is set
   - Check API quota/limits
   - Review moderation prompt configuration

---

## 🎯 Success Metrics

- **Moderation Accuracy**: AI correctly identifies unsafe content
- **Response Time**: < 1 second end-to-end
- **User Engagement**: Active discussions with real-time participation
- **Safety**: Zero harmful content published
- **Anonymity**: No user data leaks or identity exposure

---

## 📄 License & Credits

Built with:
- **Socket.IO** - Real-time communication
- **Gemini 2.5 Flash** - AI content moderation
- **MongoDB** - Data persistence
- **React** - Frontend framework
- **Express** - Backend framework

---

**Built with care for mental health support** 💙

