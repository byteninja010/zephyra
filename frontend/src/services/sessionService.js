import axios from 'axios';
import API_URL from '../config/api';

console.log('🔧 sessionService.js loaded - this should appear when the page loads');

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
      const response = await axios.get(`${API_URL}/api/sessions/upcoming/${firebaseUid}?limit=${limit}`);
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
    console.log('🚨 sessionService.completeSession FUNCTION CALLED!');
    try {
      console.log('🔍 sessionService.completeSession RECEIVED parameters:');
      console.log('🔍 sessionId:', sessionId);
      console.log('🔍 summary:', summary);
      console.log('🔍 firebaseUid (parameter):', firebaseUid);
      console.log('🔍 secretCode (parameter):', secretCode);
      
      // Use provided parameters or fall back to localStorage
      const finalFirebaseUid = firebaseUid || localStorage.getItem('firebaseUid');
      const finalSecretCode = secretCode || localStorage.getItem('userSecretCode');
      
      console.log('🔍 Frontend completeSession - firebaseUid:', finalFirebaseUid);
      console.log('🔍 Frontend completeSession - secretCode:', finalSecretCode);
      console.log('🔍 Frontend completeSession - sessionId:', sessionId);
      console.log('🔍 Frontend completeSession - localStorage firebaseUid:', localStorage.getItem('firebaseUid'));
      console.log('🔍 Frontend completeSession - localStorage secretCode:', localStorage.getItem('userSecretCode'));
      
      const requestBody = {};
      
      // Send BOTH firebaseUid and secretCode if available
      if (finalFirebaseUid) {
        requestBody.firebaseUid = finalFirebaseUid;
        console.log('✅ Including firebaseUid in request');
      }
      
      if (finalSecretCode) {
        requestBody.secretCode = finalSecretCode;
        console.log('✅ Including secretCode in request');
      }
      
      // Check if we have at least one authentication method
      if (!finalFirebaseUid && !finalSecretCode) {
        console.error('❌ No authentication data available');
        console.error('❌ firebaseUid:', finalFirebaseUid);
        console.error('❌ secretCode:', finalSecretCode);
        throw new Error('Neither Firebase UID nor secret code found. Please login again.');
      }
      
      if (summary) {
        requestBody.summary = summary;
      }
      
      console.log('🔍 Frontend completeSession - request body:', requestBody);
      
      const response = await axios.post(`${API_URL}/api/sessions/complete/${sessionId}`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  },

  // Start an instant session (for testing)
  startInstantSession: async (userContext) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      console.log('🔗 Making API request to:', `${API_URL}/api/sessions/start-instant`);
      console.log('📤 Request data:', { firebaseUid, userContext });
      
      const response = await axios.post(`${API_URL}/api/sessions/start-instant`, {
        firebaseUid,
        userContext
      });
      
      console.log('📥 API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error starting instant session:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },

  // Start a session
  startSession: async (sessionId, userContext) => {
    try {
      const response = await axios.post(`${API_URL}/api/sessions/start/${sessionId}`, {
        userContext
      });
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

  // Get upcoming sessions
  getUpcomingSessions: async (limit = 5) => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await axios.get(`${API_URL}/api/sessions/upcoming/${firebaseUid}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
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
  }
};

export default sessionService;
