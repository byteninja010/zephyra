import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymous } from '../firebase';
import authService from '../services/authService';

const SignInPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Sign in anonymously with Firebase
      const firebaseUser = await signInAnonymous();
      
      // Create user in backend and get secret code
      const response = await authService.createUser(firebaseUser.uid);
      
      if (response.success) {
        // Store user data in localStorage
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('firebaseUid', response.user.firebaseUid);
        localStorage.setItem('userSecretCode', response.user.secretCode);
        
        // Navigate to secret code display page
        navigate('/secret-code', { 
          state: { 
            secretCode: response.user.secretCode,
            isNewUser: response.message === 'User created successfully'
          } 
        });
      } else {
        setError('Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to create anonymous account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecretCodeSignIn = async () => {
    if (!secretCode.trim()) {
      setError('Please enter your secret code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate secret code with backend
      const response = await authService.validateSecretCode(secretCode);
      
      if (response.success) {
        // Store user data in localStorage
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('firebaseUid', response.user.firebaseUid);
        localStorage.setItem('userSecretCode', response.user.secretCode);
        
        navigate('/dashboard');
      } else {
        setError('Invalid secret code. Please check and try again.');
      }
    } catch (error) {
      console.error('Secret code sign-in error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to sign in. Please check your secret code.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-slate-600 hover:text-slate-800 transition-colors duration-200 mb-8"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
            <p className="text-slate-600">Choose how you'd like to access your mental wellness journey</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Sign-in Options */}
          <div className="space-y-6">
            {/* New User - Anonymous Sign-in */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">New to Zephyra?</h3>
              <button
                onClick={handleAnonymousSignIn}
                disabled={isLoading}
                className="w-full group relative inline-flex items-center justify-center px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creating Account...
                  </div>
                ) : (
                  <>
                    <span className="relative z-10">Start Your Journey</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              <p className="text-sm text-slate-500 text-center">
                Create a new anonymous account and get your secret code
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">or</span>
              </div>
            </div>

            {/* Existing User - Secret Code Sign-in */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">Returning User?</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  placeholder="Enter your secret code"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center font-mono text-lg tracking-wider"
                  maxLength={8}
                />
                <button
                  onClick={handleSecretCodeSignIn}
                  disabled={isLoading || !secretCode.trim()}
                  className="w-full px-6 py-3 text-white bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Access My Account'
                  )}
                </button>
              </div>
              <p className="text-sm text-slate-500 text-center">
                Enter the secret code you received when you first joined
              </p>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-800 text-sm font-medium mb-1">Your Privacy Matters</p>
                <p className="text-blue-700 text-xs">
                  We don't collect personal information. Your secret code is the only way to access your account. 
                  Keep it safe and private.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
