import { io } from 'socket.io-client';
import API_BASE_URL from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket?.connected) {
      console.log('🔌 Already connected to Socket.IO');
      return;
    }

    console.log('🔌 Connecting to Socket.IO server...');
    
    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Submit a new post
   * @param {string} firebaseUid - User's Firebase UID
   * @param {string} content - Post content
   */
  submitPost(firebaseUid, content) {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }
    
    console.log('📝 Submitting post via Socket.IO...');
    this.socket.emit('submit_post', { firebaseUid, content });
  }

  /**
   * Submit a new comment
   * @param {string} firebaseUid - User's Firebase UID
   * @param {string} postId - Post ID to comment on
   * @param {string} content - Comment content
   */
  submitComment(firebaseUid, postId, content, parentCommentId = null) {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }
    
    console.log(`💬 Submitting ${parentCommentId ? 'reply' : 'comment'} via Socket.IO...`);
    this.socket.emit('submit_comment', { firebaseUid, postId, content, parentCommentId });
  }

  /**
   * Listen for new posts
   * @param {Function} callback - Callback function to handle new posts
   */
  onNewPost(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('new_post', callback);
    console.log('👂 Listening for new posts');
  }

  /**
   * Listen for new comments
   * @param {Function} callback - Callback function to handle new comments
   */
  onNewComment(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('new_comment', callback);
    console.log('👂 Listening for new comments');
  }

  /**
   * Listen for post accepted
   * @param {Function} callback - Callback function to handle post acceptance
   */
  onPostAccepted(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('post_accepted', callback);
  }

  /**
   * Listen for post rejected
   * @param {Function} callback - Callback function to handle post rejection
   */
  onPostRejected(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('post_rejected', callback);
  }

  /**
   * Listen for comment accepted
   * @param {Function} callback - Callback function to handle comment acceptance
   */
  onCommentAccepted(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('comment_accepted', callback);
  }

  /**
   * Listen for comment rejected
   * @param {Function} callback - Callback function to handle comment rejection
   */
  onCommentRejected(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('comment_rejected', callback);
  }

  /**
   * Listen for post error
   * @param {Function} callback - Callback function to handle post error
   */
  onPostError(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('post_error', callback);
  }

  /**
   * Listen for comment error
   * @param {Function} callback - Callback function to handle comment error
   */
  onCommentError(callback) {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    this.socket.on('comment_error', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      console.log('🧹 Removed all Socket.IO listeners');
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;

