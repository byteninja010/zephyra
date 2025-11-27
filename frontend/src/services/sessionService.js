import axios from 'axios';
import API_URL from '../config/api';

const sessionService = {
  // Create a new session schedule
  createSessionSchedule: async (schedule) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.post(`${API_URL}/api/sessions/create`, {
        firebaseUid,
        schedule
      });
      return response.data;
    } catch (error) {
      console.error('Error creating session schedule:', error);
      throw error;
    }
  },

  // Get user's session schedule
  getSessionSchedule: async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.get(`${API_URL}/api/sessions/schedule/${firebaseUid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting session schedule:', error);
      throw error;
    }
  },

  // Get upcoming sessions for user
  getUpcomingSessions: async (limit = 5) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await axios.get(`${API_URL}/api/sessions/upcoming/${firebaseUid}?limit=${limit}&_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      throw error;
    }
  },

  // Clean up duplicate sessions
  cleanupSessions: async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.delete(`${API_URL}/api/sessions/cleanup/${firebaseUid}`);
      return response.data;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  },

  completeSession: async (sessionId, summary = null, firebaseUid = null, secretCode = null) => {
    try {
      // Use provided parameters or fall back to localStorage
      const finalFirebaseUid = firebaseUid || localStorage.getItem('firebaseUid');
      const finalSecretCode = secretCode || localStorage.getItem('userSecretCode');
      
      const requestBody = {};
      
      // Send BOTH firebaseUid and secretCode if available
      if (finalFirebaseUid) {
        requestBody.firebaseUid = finalFirebaseUid;
      }
      
      if (finalSecretCode) {
        requestBody.secretCode = finalSecretCode;
      }
      
      // Check if we have at least one authentication method
      if (!finalFirebaseUid && !finalSecretCode) {
        throw new Error('Neither Firebase UID nor secret code found. Please login again.');
      }
      
      if (summary) {
        requestBody.summary = summary;
      }
      
      const response = await axios.post(`${API_URL}/api/sessions/complete/${sessionId}`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  },

  // Get session data by ID
  getSession: async (sessionId) => {
    try {
      // Use proper GET endpoint - does NOT create sessions
      const response = await axios.get(`${API_URL}/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting session:', error);
      return { success: false };
    }
  },

  // Start an instant session (for testing)
  startInstantSession: async (userContext) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      
      // Extract customPreferences if it exists in userContext
      const customPreferences = userContext?.customPreferences || null;
      
      // Remove customPreferences from userContext to avoid duplication
      const cleanUserContext = { ...userContext };
      delete cleanUserContext.customPreferences;
      
      const requestBody = {
        firebaseUid,
        userContext: cleanUserContext
      };
      
      // Add customPreferences as separate field if provided
      if (customPreferences) {
        requestBody.customPreferences = customPreferences;
      }
      
      const response = await axios.post(`${API_URL}/api/sessions/start-instant`, requestBody);
      
      return response.data;
    } catch (error) {
      console.error('Error starting instant session:', error);
      throw error;
    }
  },

  // Start a session
  startSession: async (sessionId, userContext) => {
    try {
      // Extract customPreferences if it exists in userContext
      const customPreferences = userContext?.customPreferences || null;
      
      // Remove customPreferences from userContext to avoid duplication
      const cleanUserContext = { ...userContext };
      delete cleanUserContext.customPreferences;
      
      const requestBody = {
        userContext: cleanUserContext
      };
      
      // Add customPreferences as separate field if provided
      if (customPreferences) {
        requestBody.customPreferences = customPreferences;
      }
      
      const response = await axios.post(`${API_URL}/api/sessions/start/${sessionId}`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  },

  // Update session data
  updateSession: async (sessionId, updateType, data) => {
    try {
      const response = await axios.post(`${API_URL}/api/sessions/update/${sessionId}`, {
        updateType,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },


  // Get session history
  getSessionHistory: async (limit = 10, page = 1) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.get(`${API_URL}/api/sessions/history/${firebaseUid}`, {
        params: { limit, page }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  },

  // Cancel session schedule
  cancelSession: async (sessionId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/sessions/cancel/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  },

  // Close a session (updates summary, sets scheduled sessions to 'scheduled' status)
  closeSession: async (sessionId, firebaseUid = null, secretCode = null) => {
    try {
      const requestBody = {};
      if (firebaseUid) requestBody.firebaseUid = firebaseUid;
      if (secretCode) requestBody.secretCode = secretCode;
      
      const response = await axios.post(`${API_URL}/api/sessions/close/${sessionId}`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    }
  }
};

export default sessionService;
