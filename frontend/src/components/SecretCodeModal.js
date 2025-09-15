import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SecretCodeModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { secretCode, isNewUser } = location.state || {};
  const [copied, setCopied] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    if (!secretCode) {
      navigate('/signin');
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
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate('/signin');
  };

  if (!secretCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {isNewUser ? 'Welcome to Zephyra!' : 'Account Created!'}
            </h1>
            <p className="text-slate-600">
              {isNewUser 
                ? 'Your anonymous account has been created successfully' 
                : 'Your account is ready to use'
              }
            </p>
          </div>

          {/* Secret Code Display */}
          <div className="space-y-6">
            <div className="text-center">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Your Secret Code
              </label>
              <div className="relative">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 font-mono text-3xl font-bold text-slate-800 tracking-wider text-center select-all">
                  {secretCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-2 font-medium">Copied to clipboard!</p>
              )}
            </div>

            {/* Warning Message */}
            {showWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-amber-800 font-semibold mb-2">⚠️ Important: Save Your Secret Code</h3>
                    <div className="text-amber-700 text-sm space-y-2">
                      <p>• This is the <strong>only way</strong> to access your account</p>
                      <p>• We cannot recover it if you lose it</p>
                      <p>• Store it in a safe place (password manager, notes app, etc.)</p>
                      <p>• You'll need it every time you want to access your data</p>
                    </div>
                    <button
                      onClick={() => setShowWarning(false)}
                      className="mt-3 text-amber-600 hover:text-amber-800 text-sm font-medium underline"
                    >
                      I understand, hide this warning
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-blue-800 font-semibold mb-3">How to use your secret code:</h3>
              <div className="text-blue-700 text-sm space-y-2">
                <div className="flex items-start">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                  <p>Bookmark this page or save the code somewhere safe</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                  <p>When you return, go to the sign-in page</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                  <p>Enter your secret code to access your account</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={handleGoBack}
              className="flex-1 px-6 py-3 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors duration-200 font-medium"
            >
              Back to Sign In
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 font-semibold"
            >
              Continue to Dashboard
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Your data is encrypted and stored securely. Only you can access it with your secret code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretCodeModal;
