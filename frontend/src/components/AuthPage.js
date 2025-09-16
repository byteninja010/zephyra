import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymous } from '../firebase';
import authService from '../services/authService';

const AuthPage = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');

  const handleSecretCodeLogin = async () => {
    if (!secretCode.trim()) {
      setError('Please enter your secret code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.validateSecretCode(secretCode);

      if (response.success) {
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('firebaseUid', response.user.firebaseUid);
        localStorage.setItem('userSecretCode', response.user.secretCode);

        navigate('/dashboard');
      } else {
        setError('Invalid secret code. Please check and try again.');
      }
    } catch (error) {
      console.error('Secret code login error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to sign in. Please check your secret code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignUp = async () => {
    setIsLoading(true);
    setError('');

    try {
      localStorage.removeItem('userId');
      localStorage.removeItem('firebaseUid');
      localStorage.removeItem('userSecretCode');
      localStorage.removeItem('onboardingCompleted');

      const { signOutUser } = await import('../firebase');
      try {
        await signOutUser();
      } catch (signOutError) {
        // Ignore sign out errors (user might not be signed in)
      }

      const firebaseUser = await signInAnonymous();
      const response = await authService.createUser(firebaseUser.uid);

      if (response.success) {
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('firebaseUid', response.user.firebaseUid);
        localStorage.setItem('userSecretCode', response.user.secretCode);

        navigate('/secret-code', {
          state: {
            secretCode: response.user.secretCode,
            isNewUser: response.message === 'User created successfully',
          },
        });
      } else {
        setError('Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Anonymous sign-up error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to create anonymous account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Correct key path used below (Heroicons outline key path)
  const keyPathD =
    "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z";

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      style={{
        background:
          'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)',
      }}
    >
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20 animate-float"
          style={{
            background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
            animationDelay: '0s',
          }}
        ></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-25 animate-float"
          style={{
            background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)',
            animationDelay: '1s',
          }}
        ></div>
        <div
          className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-30 animate-float"
          style={{
            background: 'linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)',
            animationDelay: '2s',
          }}
        ></div>
        <div
          className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-20 animate-float"
          style={{
            background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)',
            animationDelay: '3s',
          }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full opacity-15 animate-gentle-pulse"
          style={{
            background: 'linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)',
            animationDelay: '1.5s',
          }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-8 h-8 rounded-full opacity-20 animate-bounce-in"
          style={{
            background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)',
            animationDelay: '2.5s',
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md mb-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-300 mb-8 mt-8 transform hover:scale-105 hover:-translate-x-1 group"
        >
          <svg
            className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </button>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img
                src="/logo.png"
                alt="Zephyra Logo"
                className="w-16 h-14 object-contain"
              />
              <h1 className="text-3xl font-bold" style={{ color: '#1E252B' }}>
                Zephyra
              </h1>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: '#1E252B' }}
            >
              {mode === 'login' ? 'Welcome Back' : 'Join Your Safe Space'}
            </h2>
            <p className="text-sm font-medium" style={{ color: '#475569' }}>
              {mode === 'login'
                ? 'Returning to your safe space'
                : 'Begin your mental wellness journey with us'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8 transform transition-all duration-300 hover:scale-[1.01]">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <span>Sign Up</span>
              </div>
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={keyPathD}
                  />
                </svg>
                <span>Login</span>
              </div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up transform transition-all duration-300 hover:scale-[1.01]">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Login Mode */}
          {mode === 'login' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: '#1E252B' }}
                >
                  Returning User
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={secretCode}
                    onChange={(e) =>
                      setSecretCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter your secret code"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-center font-mono text-lg tracking-wider transform hover:scale-[1.02] focus:scale-[1.02] focus:shadow-lg"
                    maxLength={8}
                  />
                  <button
                    onClick={handleSecretCodeLogin}
                    disabled={isLoading || !secretCode.trim()}
                    className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform active:scale-95"
                    style={{
                      background:
                        'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                    }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Signing In...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <svg
                          className="w-6 h-6 group-hover:animate-wiggle"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={keyPathD}
                          />
                        </svg>
                        <span>Access My Account</span>
                      </div>
                    )}
                  </button>
                </div>
                <p className="text-sm text-center" style={{ color: '#475569' }}>
                  Enter the secret code you received when you first joined
                </p>
              </div>
            </div>
          )}

          {/* Signup Mode */}
          {mode === 'signup' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: '#1E252B' }}
                >
                  New to Zephyra?
                </h3>

                {/* Privacy Information */}
                <div
                  className="p-4 rounded-xl border transform transition-all duration-300 hover:scale-[1.01] hover:shadow-md"
                  style={{
                    background: 'rgba(60, 145, 197, 0.05)',
                    borderColor: '#3C91C5',
                  }}
                >
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-3 mt-0.5"
                      style={{ color: '#3C91C5' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: '#1E252B' }}
                      >
                        No Need to Worry - Your Account Will Be Anonymous
                      </p>
                      <p className="text-xs" style={{ color: '#475569' }}>
                        We don't collect personal information. Your secret code
                        is the only way to access your account. Keep it safe and
                        private. Your mental health journey remains completely
                        confidential.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAnonymousSignUp}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform active:scale-95"
                  style={{
                    background:
                      'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <svg
                        className="w-6 h-6 group-hover:animate-wiggle"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      <span>Start Your Journey</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  )}
                </button>
                <p className="text-sm text-center" style={{ color: '#475569' }}>
                  Create a new anonymous account and get your secret code
                </p>
              </div>
            </div>
          )}

          {/* Powered by Gemini */}
          <div className="mt-8 flex items-center justify-center space-x-2 transform transition-all duration-300 hover:scale-105 group">
            <div className="relative overflow-hidden rounded-lg">
              <img
                src="/Google_Gemini_logo.png"
                alt="Gemini AI"
                className="w-6 h-6 object-contain group-hover:animate-wiggle transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 group-hover:animate-shimmer"></div>
            </div>
            <span
              className="text-sm font-medium group-hover:text-blue-600 transition-colors duration-300"
              style={{ color: '#475569' }}
            >
              Powered by Gemini – AI with care
            </span>
          </div>
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-sm font-medium"
          style={{ color: '#475569' }}
        >
          Your journey, your pace, your privacy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
