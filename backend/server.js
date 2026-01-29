const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://zephyra-phi.vercel.app','https://zephyra-cbe14.web.app','https://zephyra.myprojectss.info'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://zephyra-phi.vercel.app','https://zephyra-cbe14.web.app','https://zephyra.myprojectss.info'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const sessionRoutes = require('./routes/sessions');
const canvasRoutes = require('./routes/canvas');
const forumRoutes = require('./routes/forum');

// Import Socket.IO handlers
const { setupForumHandlers } = require('./socket/forumHandlers');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API Running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Use auth routes
app.use('/api/auth', authRoutes);

// Use chat routes
app.use('/api/chat', chatRoutes);

// Use session routes
app.use('/api/sessions', sessionRoutes);

// Use canvas routes
app.use('/api/canvas', canvasRoutes);

// Use forum routes
app.use('/api/forum', forumRoutes);

// Initialize Socket.IO handlers
setupForumHandlers(io);

// Start server
server.listen(PORT, () => {
  // Server running
});
