import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInAnonymously, signOut } from 'firebase/auth';
import authService from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from our backend
          const userData = await authService.getUser(firebaseUser.uid);
          setUser({ ...firebaseUser, ...userData.user });
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If user doesn't exist in backend, create them
          try {
            const createData = await authService.createUser(firebaseUser.uid);
            setUser({ ...firebaseUser, ...createData.user });
          } catch (createError) {
            console.error('Error creating user:', createError);
            setUser(firebaseUser);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  return {
    user,
    loading,
    signInAnonymously,
    signOutUser,
    updateUser
  };
};

