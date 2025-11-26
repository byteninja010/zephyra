import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SecretCodeModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { secretCode, isNewUser } = location.state || {};
  const [copied, setCopied] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(true);

  useEffect(() => {
    if (!secretCode) {
      navigate('/auth');
    }
  }, [secretCode, navigate]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(secretCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleContinue = () => {
    if (isNewUser) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoBack = () => {
    navigate('/auth');
  };

  const handleAcceptWarning = () => {
    setShowWarningModal(false);
  };

  if (!secretCode) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Background Blur Overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-md animate-fade-in">
            <div className="dashboard-card bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-white/20">
              {/* Modal Header */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2" style={{ color: '#1E252B' }}>Important: Save Your Secret Code</h2>
                <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>Please read this carefully before proceeding</p>
              </div>

              {/* Warning Content */}
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl border" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: '#F59E0B' }}>
                  <div className="text-xs sm:text-sm space-y-2 sm:space-y-3" style={{ color: '#475569' }}>
                    <div className="flex items-start">
                      <span className="text-amber-600 mr-3 mt-0.5">•</span>
                      <p>This is the <strong>only way</strong> to access your account</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-amber-600 mr-3 mt-0.5">•</span>
                      <p>We cannot recover it if you lose it</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-amber-600 mr-3 mt-0.5">•</span>
                      <p>Store it in a safe place</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-amber-600 mr-3 mt-0.5">•</span>
                      <p>You'll need it every time you want to access your data</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => navigate('/auth')}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1 transform active:scale-95"
                  style={{ 
                    background: 'rgba(107, 114, 128, 0.1)', 
                    color: '#475569',
                    border: '1px solid rgba(107, 114, 128, 0.2)'
                  }}
                >
                  Go Back
                </button>
                <button
                  onClick={handleAcceptWarning}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
                >
                  Get Secret Code 
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20 animate-float" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', animationDelay: '0s' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-25 animate-float" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)', animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-30 animate-float" style={{ background: 'linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)', animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-20 animate-float" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)', animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full opacity-15 animate-gentle-pulse" style={{ background: 'linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)', animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-8 h-8 rounded-full opacity-20 animate-bounce-in" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)', animationDelay: '2.5s' }}></div>
      </div>

      {!showWarningModal && (
        <div className="relative z-10 w-full max-w-lg mx-auto mb-4 sm:mb-8 px-2 sm:px-4">
          {/* Back Button */}
          <button
            onClick={handleGoBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-all duration-300 mb-4 sm:mb-6 mt-4 sm:mt-8 transform hover:scale-105 hover:-translate-x-1 group text-xs sm:text-sm md:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auth
          </button>

          {/* Main Card */}
          <div className="dashboard-card bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-white/20 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-4">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-1 sm:mb-1">
              <img 
                src="/logo.png" 
                alt="Zephyra Logo" 
                className="w-10 h-8 sm:w-12 sm:h-10 md:w-16 md:h-14 object-contain"
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: '#1E252B' }}>Welcome to Zephyra!</h1>
            </div>
            
          </div>

          {/* Secret Code Display */}
          <div className="space-y-4 sm:space-y-5">
            <div className="text-center">
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: '#1E252B' }}>
                Your Secret Code
              </label>
              <div className="relative">
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 font-mono text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wider text-center select-all transform transition-all duration-300 hover:scale-[1.02] focus:scale-[1.02] focus:shadow-lg break-all" style={{ color: '#1E252B', wordBreak: 'break-all' }}>
                  {secretCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 transition-all duration-300 transform hover:scale-110"
                  aria-label="Copy secret code"
                >
                  {copied ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 animate-bounce-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-xs sm:text-sm mt-2 font-medium animate-slide-up">Copied to clipboard!</p>
              )}
            </div>


            {/* Instructions */}
            <div className="dashboard-card p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border transform transition-all duration-300 hover:scale-[1.01] hover:shadow-md" style={{ background: 'rgba(60, 145, 197, 0.05)', borderColor: '#3C91C5' }}>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-3" style={{ color: '#1E252B' }}>How to use your secret code:</h3>
              <div className="text-xs sm:text-sm space-y-2 sm:space-y-2.5" style={{ color: '#475569' }}>
                <div className="flex items-start">
                  <span className="text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 flex-shrink-0" style={{ background: '#3C91C5', color: 'white' }}>1</span>
                  <p className="leading-relaxed">Save the code somewhere safe</p>
                </div>
                <div className="flex items-start">
                  <span className="text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 flex-shrink-0" style={{ background: '#3C91C5', color: 'white' }}>2</span>
                  <p className="leading-relaxed">When you return, go to the login page</p>
                </div>
                <div className="flex items-start">
                  <span className="text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 flex-shrink-0" style={{ background: '#3C91C5', color: 'white' }}>3</span>
                  <p className="leading-relaxed">Enter your secret code to access your account</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 md:mt-6">
            <button
              onClick={handleGoBack}
              className="flex-1 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1 transform active:scale-95"
              style={{ 
                background: 'rgba(107, 114, 128, 0.1)', 
                color: '#475569',
                border: '1px solid rgba(107, 114, 128, 0.2)'
              }}
            >
              Back to Auth
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
            >
              Continue to Dashboard
            </button>
          </div>

          {/* Powered by Gemini */}
          <div className="mt-4 sm:mt-6 md:mt-6 flex items-center justify-center space-x-1 sm:space-x-2 transform transition-all duration-300 hover:scale-105 group">
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src="/Google_Gemini_logo.png" 
                alt="Gemini AI" 
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain group-hover:animate-wiggle transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 group-hover:animate-shimmer"></div>
            </div>
            <span className="text-xs sm:text-sm font-medium group-hover:text-blue-600 transition-colors duration-300" style={{ color: '#475569' }}>Powered by Gemini – AI with care</span>
          </div>

          {/* Footer */}
          <div className="mt-3 sm:mt-4 md:mt-4 text-center px-2">
            <p className="text-xs sm:text-xs" style={{ color: '#94A3B8' }}>
              Your data is encrypted and stored securely. Only you can access it with your secret code.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default SecretCodeModal;

