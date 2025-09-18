import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const firebaseUid = localStorage.getItem('firebaseUid');
        const secretCode = localStorage.getItem('userSecretCode');
        const userId = localStorage.getItem('userId');

        console.log('🔍 AuthContext - Initializing from localStorage:');
        console.log('🔍 AuthContext - firebaseUid:', firebaseUid);
        console.log('🔍 AuthContext - secretCode:', secretCode);
        console.log('🔍 AuthContext - userId:', userId);

        if (firebaseUid && secretCode && userId) {
          // Verify the user still exists and is valid
          try {
            const response = await authService.getUser(firebaseUid);
            if (response.success) {
              setUser({
                id: userId,
                firebaseUid: firebaseUid,
                secretCode: secretCode,
                ...response.user
              });
              console.log('🔍 AuthContext - User authenticated from localStorage');
            } else {
              console.log('🔍 AuthContext - User not found, clearing localStorage');
              clearAuthData();
            }
          } catch (error) {
            console.error('🔍 AuthContext - Error verifying user:', error);
            clearAuthData();
          }
        } else {
          console.log('🔍 AuthContext - No valid auth data in localStorage');
        }
      } catch (error) {
        console.error('🔍 AuthContext - Error initializing auth:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('firebaseUid');
    localStorage.removeItem('userSecretCode');
    localStorage.removeItem('onboardingCompleted');
    setUser(null);
  };

  const login = async (secretCode) => {
    try {
      const response = await authService.validateSecretCode(secretCode);
      
      if (response.success) {
        const userData = {
          id: response.user.id,
          firebaseUid: response.user.firebaseUid,
          secretCode: response.user.secretCode,
          ...response.user
        };

        // Store in localStorage
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('firebaseUid', userData.firebaseUid);
        localStorage.setItem('userSecretCode', userData.secretCode);

        // Store in context
        setUser(userData);

        console.log('🔍 AuthContext - Login successful:', userData);
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'Invalid secret code' };
      }
    } catch (error) {
      console.error('🔍 AuthContext - Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async () => {
    try {
      const { signInAnonymous } = await import('../firebase');
      
      // Clear any existing data
      clearAuthData();
      
      const firebaseUser = await signInAnonymous();
      const response = await authService.createUser(firebaseUser.uid);

      if (response.success) {
        const userData = {
          id: response.user.id,
          firebaseUid: response.user.firebaseUid,
          secretCode: response.user.secretCode,
          ...response.user
        };

        // Store in localStorage
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('firebaseUid', userData.firebaseUid);
        localStorage.setItem('userSecretCode', userData.secretCode);

        // Store in context
        setUser(userData);

        console.log('🔍 AuthContext - Signup successful:', userData);
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'Failed to create account' };
      }
    } catch (error) {
      console.error('🔍 AuthContext - Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearAuthData();
  };

  const getAuthData = () => {
    return {
      firebaseUid: user?.firebaseUid || localStorage.getItem('firebaseUid'),
      secretCode: user?.secretCode || localStorage.getItem('userSecretCode'),
      userId: user?.id || localStorage.getItem('userId')
    };
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    getAuthData,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
