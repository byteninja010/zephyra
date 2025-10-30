import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if user is on mobile/tablet
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone || 
                         document.referrer.includes('android-app://');

    // Check if user dismissed the prompt recently (within 7 days)
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const shouldShowAgain = !dismissedTime || (Date.now() - parseInt(dismissedTime)) > sevenDaysInMs;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      
      // Show our custom prompt if conditions are met
      if ((isMobile || isTablet) && !isStandalone && shouldShowAgain) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000); // Show after 2 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS devices (Safari doesn't support beforeinstallprompt)
    if ((isMobile || isTablet) && !isStandalone && shouldShowAgain) {
      // Check if iOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        // Show iOS-specific instructions after 2 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no prompt (iOS), just close and show instructions were shown
      setShowPrompt(false);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }
    
    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Store dismissal time
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!showPrompt) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300"></div>
      
      {/* Install Prompt */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-500">
        <div 
          className="dashboard-card mx-4 mt-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}
        >
          {/* Floating Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 right-4 w-16 h-16 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
          </div>

          <div className="relative p-6">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all duration-300 hover:scale-110"
              style={{ color: '#475569' }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex items-start space-x-4 pr-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <img 
                    src="/logo.png" 
                    alt="Zephyra" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1E252B' }}>
                  Install Zephyra
                </h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>
                  {isIOS 
                    ? 'Add Zephyra to your home screen for quick access and a native app experience.'
                    : 'Install Zephyra for faster access, offline support, and a native app experience.'
                  }
                </p>

                {/* iOS Instructions */}
                {isIOS && (
                  <div className="dashboard-card mb-4 p-3 bg-white/60 backdrop-blur-sm rounded-xl">
                    <p className="text-xs font-semibold mb-2" style={{ color: '#1E252B' }}>
                      📱 How to Install:
                    </p>
                    <ol className="text-xs space-y-1" style={{ color: '#475569' }}>
                      <li>1. Tap the <strong>Share</strong> button (↑) in Safari</li>
                      <li>2. Scroll and tap <strong>"Add to Home Screen"</strong></li>
                      <li>3. Tap <strong>"Add"</strong> to confirm</li>
                    </ol>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {!isIOS && (
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 px-4 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                      style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
                    >
                      Install Now
                    </button>
                  )}
                  <button
                    onClick={handleDismiss}
                    className={`${isIOS ? 'flex-1' : 'px-4'} py-3 rounded-xl font-medium transition-all duration-300 bg-white/80 hover:bg-white`}
                    style={{ color: '#475569' }}
                  >
                    {isIOS ? 'Got it!' : 'Later'}
                  </button>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-white/40 backdrop-blur-sm rounded-lg">
                <div className="text-xl mb-1">⚡</div>
                <p className="text-xs font-medium" style={{ color: '#475569' }}>Faster</p>
              </div>
              <div className="text-center p-2 bg-white/40 backdrop-blur-sm rounded-lg">
                <div className="text-xl mb-1">📱</div>
                <p className="text-xs font-medium" style={{ color: '#475569' }}>Native Feel</p>
              </div>
              <div className="text-center p-2 bg-white/40 backdrop-blur-sm rounded-lg">
                <div className="text-xl mb-1">🌙</div>
                <p className="text-xs font-medium" style={{ color: '#475569' }}>Offline</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstallPrompt;

