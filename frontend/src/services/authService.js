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
  }
};

export default authService;

