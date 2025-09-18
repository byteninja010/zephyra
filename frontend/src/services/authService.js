import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const authService = {
  // Create user with secret code
  createUser: async (firebaseUid) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/create-user`, {
        firebaseUid
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Validate secret code
  validateSecretCode: async (secretCode) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/validate-secret-code`, {
        secretCode
      });
      return response.data;
    } catch (error) {
      console.error('Error validating secret code:', error);
      throw error;
    }
  },

  // Get user by Firebase UID
  getUser: async (firebaseUid) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/user/${firebaseUid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  // Update last login
  updateLastLogin: async (firebaseUid) => {
    try {
      const response = await axios.put(`${API_URL}/api/auth/user/${firebaseUid}/last-login`);
      return response.data;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  },

  // Update onboarding data
  updateOnboarding: async (firebaseUid, onboardingData) => {
    try {
      const response = await axios.put(`${API_URL}/api/auth/user/${firebaseUid}/onboarding`, onboardingData);
      return response.data;
    } catch (error) {
      console.error('Error updating onboarding data:', error);
      throw error;
    }
  },

  // Submit mood
  submitMood: async (firebaseUid, moodData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/user/${firebaseUid}/mood`, moodData);
      return response.data;
    } catch (error) {
      console.error('Error submitting mood:', error);
      throw error;
    }
  },

  // Submit reflection
  submitReflection: async (firebaseUid, reflectionData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/user/${firebaseUid}/reflection`, reflectionData);
      return response.data;
    } catch (error) {
      console.error('Error submitting reflection:', error);
      throw error;
    }
  },

  // Log activity
  logActivity: async (firebaseUid, activityType) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/user/${firebaseUid}/activity`, { type: activityType });
      return response.data;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  },

  // Get reflections
  getReflections: async (firebaseUid) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/user/${firebaseUid}/reflections`);
      return response.data;
    } catch (error) {
      console.error('Error getting reflections:', error);
      throw error;
    }
  },

  // Get activity history
  getActivityHistory: async (firebaseUid) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/user/${firebaseUid}/activities`);
      return response.data;
    } catch (error) {
      console.error('Error getting activity history:', error);
      throw error;
    }
  },

  // Chat-related methods
  createNewChat: async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.post(`${API_URL}/api/chat/create`, { firebaseUid });
      return response.data;
    } catch (error) {
      console.error('Error creating new chat:', error);
      throw error;
    }
  },

  getChatHistory: async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.get(`${API_URL}/api/chat/history/${firebaseUid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  getChat: async (chatId) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat:', error);
      throw error;
    }
  },

  deleteChat: async (chatId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/chat/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },

  sendChatMessage: async (chatId, message, messageType = 'text', audioMode = false) => {
    try {
      const response = await axios.post(`${API_URL}/api/chat/${chatId}/message`, {
        message,
        messageType,
        audioMode
      });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  sendAudioMessage: async (chatId, audioBlob) => {
    try {
      const formData = new FormData();
      // Use the correct file extension based on the blob type
      const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
      formData.append('audio', audioBlob, `audio.${fileExtension}`);
      
      const response = await axios.post(`${API_URL}/api/chat/${chatId}/audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error sending audio message:', error);
      throw error;
    }
  },


  deleteChat: async (chatId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/chat/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }
};

export default authService;

