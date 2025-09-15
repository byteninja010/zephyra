# Zephyra - Mental Health Dashboard

A Tier 1 mental health dashboard built with the MERN stack, featuring Firebase Anonymous Authentication and TailwindCSS.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Firebase project with Anonymous Authentication enabled

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd Zephyra
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

4. **Configure MongoDB:**
   - Update `backend/.env` with your MongoDB connection string
   - For local MongoDB: `mongodb://localhost:27017/zephyra-mental-health`
   - For MongoDB Atlas: Replace with your Atlas connection string

5. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Anonymous Authentication
   - Copy your Firebase config to `frontend/src/firebase.js`

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
npm run dev
```
App will run on http://localhost:3000

## 📁 Project Structure

```
Zephyra/
├─ backend/
│  ├─ models/          # MongoDB models
│  ├─ routes/          # API routes
│  ├─ server.js        # Express server
│  ├─ .env            # Environment variables
│  └─ package.json
└─ frontend/
   ├─ src/
   │  ├─ components/   # React components
   │  ├─ pages/        # Page components
   │  ├─ firebase.js   # Firebase configuration
   │  └─ App.js        # Main app component
   ├─ tailwind.config.js
   └─ package.json
```

## 🔧 Configuration

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Authentication > Anonymous
4. Copy the config object to `frontend/src/firebase.js`

### MongoDB Setup
- **Local:** Install MongoDB locally and update `MONGO_URI` in `backend/.env`
- **Atlas:** Create a cluster and update `MONGO_URI` with your connection string

## 🎨 Features

- ✅ React.js with TailwindCSS
- ✅ Node.js + Express backend
- ✅ MongoDB with Mongoose
- ✅ Firebase Anonymous Authentication
- ✅ Axios for API calls
- ✅ Responsive design
- ✅ Loading states and error handling
- ✅ Modern UI with gradients and animations

## 🚀 Next Steps

The project is ready for further development. You can now:
- Add more dashboard components
- Implement data models
- Create API endpoints
- Add more authentication features
- Integrate with mental health APIs

## 📝 Scripts

- `npm run dev` - Start backend with nodemon
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production

## 🔒 Security

- Anonymous authentication for privacy
- CORS enabled for cross-origin requests
- Environment variables for sensitive data
- Secure MongoDB connections

---

**Ready to build your mental health dashboard! 🧠💙**
