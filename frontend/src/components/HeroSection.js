import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
        <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="dashboard-card relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3">
            {/* Logo */}
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <img 
                  src="/logo.png" 
                  alt="Zephyra Logo" 
                  className="w-12 h-10 sm:w-16 sm:h-14 object-contain"
                />
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1E252B' }}>Zephyra</h1>
              </div>
            
            {/* Navigation Items */}
            <div className="flex items-center space-x-3 sm:space-x-6 md:space-x-8">
              <a href="#features" onClick={(e) => handleSmoothScroll(e, 'features')} className="hidden sm:inline text-xs sm:text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer" style={{ color: '#475569' }}>Features</a>
              <a href="#about" onClick={(e) => handleSmoothScroll(e, 'about')} className="hidden md:inline text-xs sm:text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer" style={{ color: '#475569' }}>About Us</a>
              <button 
                onClick={() => navigate('/auth/login')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                  color: 'white'
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              {/* Main Headline */}
              <div className="space-y-4 sm:space-y-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ color: '#1E252B' }}>
                  Your Safe Space for
                  <span className="block mt-2" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Support, Anytime
                  </span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-relaxed" style={{ color: '#2C363E' }}>
                  Check in with your mood, talk to our chatbot, or get crisis help — all in one place.
                </p>
              </div>

              {/* CTA Button */}
              <div className="pt-2 sm:pt-4">
                <button
                  onClick={handleGetStarted}
                  className="group relative inline-flex items-center justify-center px-6 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl font-semibold text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 w-full sm:w-auto"
                  style={{ 
                    background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                    boxShadow: '0 20px 40px rgba(60, 145, 197, 0.4)'
                  }}
                >
                  <span className="relative z-10">Begin Your Journey</span>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, #2C363E 0%, #475569 100%)' }}></div>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                
                {/* Powered by Gemini */}
                <div className="mt-3 sm:mt-4 flex justify-center sm:justify-start">
                  <div className="dashboard-card flex items-center space-x-1 sm:space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-3 sm:px-6 py-1.5 sm:py-2 shadow-lg border border-white/20">                 
                    <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      Powered by
                    </span>
                    <img 
                      src="/Google_Gemini_logo.png" 
                      alt="Gemini AI" 
                      className="w-6 sm:w-10 object-contain"
                    />
                    <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      - AI with care
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Assurance Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-8">
                <div className="dashboard-card flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)' }}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="#E65100" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: '#475569' }}>Simple Mood Check-ins</span>
                </div>
                <div className="dashboard-card flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)' }}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="#7B1FA2" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 13.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: '#475569' }}>Chat Anytime with Gemini</span>
                </div>
                <div className="dashboard-card flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)' }}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: '#475569' }}>Mobile Compatible</span>
                </div>
                <div className="dashboard-card flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFCDD2 0%, #EF9A9A 100%)' }}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="#C62828" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight" style={{ color: '#475569' }}>Crisis Support 24/7</span>
                </div>
              </div>
            </div>

            {/* Right Side - Calming Illustration */}
            <div className="relative hidden lg:block">
              <div className="relative w-full h-96 lg:h-[500px]">
                {/* Abstract Wave Illustration */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-80 h-80">
                    {/* Main Circle */}
                    <div className="absolute inset-0 rounded-full opacity-20 animate-pulse" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
                    <div className="absolute inset-4 rounded-full opacity-30 animate-pulse" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)', animationDelay: '1s' }}></div>
                    <div className="absolute inset-8 rounded-full opacity-40 animate-pulse" style={{ background: 'linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)', animationDelay: '2s' }}></div>
                    
                    {/* Floating Elements */}
                    <div className="absolute top-8 left-8 w-16 h-16 rounded-full opacity-60 animate-bounce" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', animationDuration: '3s' }}></div>
                    <div className="absolute top-16 right-12 w-12 h-12 rounded-full opacity-50 animate-bounce" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)', animationDuration: '4s', animationDelay: '1s' }}></div>
                    <div className="absolute bottom-12 left-12 w-20 h-20 rounded-full opacity-40 animate-bounce" style={{ background: 'linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)', animationDuration: '5s', animationDelay: '2s' }}></div>
                    <div className="absolute bottom-8 right-8 w-14 h-14 rounded-full opacity-50 animate-bounce" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)', animationDuration: '6s', animationDelay: '3s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Features Section */}
      <div id="features" className="relative z-10 py-12 sm:py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
          <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
          <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>Why Choose Us?</h2>
            <p className="text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto px-4" style={{ color: '#475569' }}>
              Comprehensive mental health support designed with care and powered by advanced AI
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Feature Cards */}
            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' }}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="#1976D2" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Personalized Therapy Sessions</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>Experience uniquely personalized therapy sessions based on your preferences & mood with calming soundscapes by <strong>Google Lyria</strong> and stunning backgrounds from <strong>Gemini Imagen-3</strong>.</p>
            </div>

            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' }}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="#F57C00" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Personalized Activities</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}> Quick Chat with <strong>Gemini</strong> anytime, journal your reflections and receive thoughtful AI insights and practice breathing exercises — all personalized for your wellness journey.</p>
            </div>

            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)' }}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Mood Canvas with AI Analysis</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>Express yourself freely on a creative canvas. <strong>Gemini's</strong> advanced <strong>vision</strong> capabilities analyze your artwork and provide gentle, empathetic insights on your drawn patterns.</p>
            </div>

            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' }}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="#E65100" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Anonymous Community Forum</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>Share without fear. Connect with real people who understand, heal together — completely anonymously. <strong>Gemini</strong> acts as a <strong>moderator</strong> & keeps every conversation safe and judgment-free.</p>
            </div>

            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)' }}>
                <img 
                  src="/Google_Gemini_logo.png" 
                  alt="Gemini AI" 
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 object-contain"
                />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Powered by Gemini & Vertex AI</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>Every feature enhanced by <strong>Google's</strong> most advanced <strong>AI</strong> technologies — <strong>Gemini</strong> for intelligent <strong>conversations</strong> and insights, <strong>Imagen-3</strong> for stunning <strong>visuals</strong>, <strong>Lyria</strong> for personalized therapeutic <strong>music</strong>.</p>
            </div>

            <div className="dashboard-card group p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)' }}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="#00695C" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-center" style={{ color: '#1E252B' }}>Privacy First</h3>
              <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>Built on <strong>Google Firebase</strong> for <strong>anonymous authentication</strong> — no personal info required. Your data is encrypted, forum interactions are pseudonymous, and your identity stays protected.</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Us Section */}
      <div id="about" className="relative z-10 py-12 sm:py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
          <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
          <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-10 sm:mb-14 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>Meet the Team Oblivians</h2>
            <p className="text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto px-4" style={{ color: '#475569' }}>
              Passionate innovators combining mental wellness expertise with cutting-edge AI to transform lives
            </p>
          </div>

          {/* Team Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-6">
            
            {/* Team Member 1 - AI/ML Engineer */}
            <div className="group relative flex justify-center items-center">
              <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-white/40 flex flex-col justify-center items-center w-full min-h-[280px] sm:min-h-[380px]">
                {/* Avatar */}
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300 overflow-hidden ring-4 ring-purple-500/30">
                      <img 
                        src="/Sarthak.jpeg" 
                        alt="Sarthak"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                          e.target.parentElement.innerHTML = '<span class="flex items-center justify-center text-4xl sm:text-5xl text-white w-full h-full">🤖</span>';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-md">
                      <span className="text-lg sm:text-xl">✨</span>
                    </div>
                  </div>
                </div>
                
                {/* Name */}
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: '#1E252B' }}>Sarthak</h3>
                
                {/* Role */}
                <div className="mb-3 sm:mb-4 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-center px-3 py-1.5 rounded-full mx-auto inline-block" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    AI/ML Engineer
                  </p>
                </div>
                
                {/* Description */}
                <p className="text-xs sm:text-sm text-center font-light leading-relaxed flex-grow" style={{ color: '#475569' }}>
                  Designing AI architectures with Gemini, Imagen-3 & Lyria—creating intelligent, empathetic mental wellness experiences
                </p>
              </div>
            </div>

            {/* Team Member 2 - Full Stack Developer */}
            <div className="group relative flex justify-center items-center">
              <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-white/40 flex flex-col justify-center items-center w-full min-h-[280px] sm:min-h-[380px]">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300 overflow-hidden ring-4 ring-pink-500/30">
                      <img 
                        src="/Anshika.jpeg" 
                        alt="Anshika"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                          e.target.parentElement.innerHTML = '<span class="flex items-center justify-center text-4xl sm:text-5xl text-white w-full h-full">💻</span>';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-md">
                      <span className="text-lg sm:text-xl">⚡</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: '#1E252B' }}>Anshika</h3>
                <div className="mb-3 sm:mb-4 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-center px-3 py-1.5 rounded-full mx-auto inline-block" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    Full Stack Developer
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-center font-light leading-relaxed flex-grow" style={{ color: '#475569' }}>
                  Crafting beautiful, responsive UIs with React.js and building robust backend services—bringing wellness to life
                </p>
              </div>
            </div>

            {/* Team Member 3 - Full Stack Developer */}
            <div className="group relative flex justify-center items-center">
              <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-white/40 flex flex-col justify-center items-center w-full min-h-[280px] sm:min-h-[380px]">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300 overflow-hidden ring-4 ring-blue-500/30">
                      <img 
                        src="/Anuj.jpeg" 
                        alt="Anuj"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                          e.target.parentElement.innerHTML = '<span class="flex items-center justify-center text-4xl sm:text-5xl text-white w-full h-full">🚀</span>';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-md">
                      <span className="text-lg sm:text-xl">💡</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: '#1E252B' }}>Anuj</h3>
                <div className="mb-3 sm:mb-4 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-center px-3 py-1.5 rounded-full mx-auto inline-block" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                    Full Stack Developer
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-center font-light leading-relaxed flex-grow" style={{ color: '#475569' }}>
                  Building scalable REST APIs with Node.js & Express—powering personalized therapy sessions and mood analytics
                </p>
              </div>
            </div>

            {/* Team Member 4 - Full Stack Developer */}
            <div className="group relative flex justify-center items-center">
              <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-white/40 flex flex-col justify-center items-center w-full min-h-[280px] sm:min-h-[380px]">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300 overflow-hidden ring-4 ring-green-500/30">
                      <img 
                        src="/Shantanu.jpeg" 
                        alt="Shantanu"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
                          e.target.parentElement.innerHTML = '<span class="flex items-center justify-center text-4xl sm:text-5xl text-white w-full h-full">🌐</span>';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-md">
                      <span className="text-lg sm:text-xl">🔧</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: '#1E252B' }}>Shantanu</h3>
                <div className="mb-3 sm:mb-4 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-center px-3 py-1.5 rounded-full mx-auto inline-block" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                    Full Stack Developer
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-center font-light leading-relaxed flex-grow" style={{ color: '#475569' }}>
                  Developing secure Firebase authentication and real-time forum features with Socket.IO—keeping users safe & connected
                </p>
              </div>
            </div>

            {/* Team Member 5 - AI/ML Engineer */}
            <div className="group relative flex justify-center items-center">
              <div className="dashboard-card bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-white/40 flex flex-col justify-center items-center w-full min-h-[280px] sm:min-h-[380px]">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300 overflow-hidden ring-4 ring-orange-500/30">
                      <img 
                        src="/Prateek.jpeg" 
                        alt="Prateek"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
                          e.target.parentElement.innerHTML = '<span class="flex items-center justify-center text-4xl sm:text-5xl text-white w-full h-full">🧠</span>';
                        }}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-md">
                      <span className="text-lg sm:text-xl">🔬</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2" style={{ color: '#1E252B' }}>Prateek</h3>
                <div className="mb-3 sm:mb-4 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-center px-3 py-1.5 rounded-full mx-auto inline-block" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                    AI/ML Engineer
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-center font-light leading-relaxed flex-grow" style={{ color: '#475569' }}>
                  Implementing AI moderation with Gemini and canvas analysis—ensuring safe, supportive community interactions
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 sm:py-8 border-t border-white/20" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <button 
                onClick={() => setShowPrivacyModal(true)} 
                className="text-xs sm:text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ color: '#475569' }}
              >
                Privacy
              </button>
              <button 
                onClick={() => setShowTermsModal(true)} 
                className="text-xs sm:text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ color: '#475569' }}
              >
                Terms and Conditions
              </button>
            </div>
            <p className="text-xs sm:text-sm font-light text-center" style={{ color: '#475569' }}>
              Your safety and privacy come first.
            </p>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}>
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar" 
            style={{ 
              background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(60, 145, 197, 0.3) transparent'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
              <div className="absolute top-10 left-8 w-20 h-20 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
              <div className="absolute top-20 right-10 w-16 h-16 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
              <div className="absolute bottom-16 left-1/4 w-12 h-12 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
            </div>

            <div className="relative z-10 p-6 sm:p-10">
              {/* Close Button */}
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-lg transition-all duration-300 hover:rotate-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="#475569" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: '#1E252B' }}>Privacy Policy</h2>
                <p className="text-sm sm:text-base font-light" style={{ color: '#475569' }}>Last updated: October 30, 2025</p>
              </div>

              {/* Content */}
              <div className="space-y-4 sm:space-y-6 text-sm sm:text-base" style={{ color: '#2C363E' }}>
                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Your Privacy Matters</h3>
                  <p className="font-light leading-relaxed">
                    At Zephyra, we prioritize your privacy and confidentiality. We use <strong>Google Firebase Anonymous Authentication</strong> to ensure you can access our mental health support without revealing your identity.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>What We Collect</h3>
                  <ul className="list-disc list-inside space-y-2 font-light leading-relaxed">
                    <li><strong>Anonymous User Data:</strong> We use Firebase Anonymous Authentication—no email, contact information, or personal information required.</li>
                    <li><strong>Chat Data:</strong> Your conversations with our AI chatbot powered by <strong>Gemini</strong> are stored securely to provide personalized support.</li>
                    <li><strong>Mood Canvas Drawings:</strong> Visual expressions analyzed by <strong>Gemini Vision</strong> to understand your emotional state.</li>
                    <li><strong>Reflection Entries:</strong> Optional daily reflections to help you track your mental wellness journey.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>How We Protect Your Data</h3>
                  <ul className="list-disc list-inside space-y-2 font-light leading-relaxed">
                    <li><strong>Pseudonymous Identities:</strong> In the community forum, we assign you a unique pseudonym to protect your real identity.</li>
                    <li><strong>AI Moderation:</strong> All forum posts are moderated by <strong>Gemini AI</strong> to ensure a safe, supportive environment.</li>
                    <li><strong>Secure Storage:</strong> All data is encrypted and stored securely using industry-standard practices.</li>
                    <li><strong>No Third-Party Sharing:</strong> Your data is never sold or shared with third parties for marketing purposes.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Your Rights</h3>
                  <p className="font-light leading-relaxed">
                    You have the right to request deletion of your data at any time. Contact us through the email, and we'll remove your information within 30 days.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Contact Us</h3>
                  <p className="font-light leading-relaxed">
                    If you have questions about our privacy practices, please reach out to us at <strong>anujkamaljain1234@gmail.com</strong>
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar" 
            style={{ 
              background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(60, 145, 197, 0.3) transparent'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
              <div className="absolute top-10 left-8 w-20 h-20 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
              <div className="absolute top-20 right-10 w-16 h-16 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
              <div className="absolute bottom-16 left-1/4 w-12 h-12 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
            </div>

            <div className="relative z-10 p-6 sm:p-10">
              {/* Close Button */}
              <button 
                onClick={() => setShowTermsModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-lg transition-all duration-300 hover:rotate-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="#475569" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: '#1E252B' }}>Terms and Conditions</h2>
                <p className="text-sm sm:text-base font-light" style={{ color: '#475569' }}>Last updated: October 30, 2025</p>
              </div>

              {/* Content */}
              <div className="space-y-4 sm:space-y-6 text-sm sm:text-base" style={{ color: '#2C363E' }}>
                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Acceptance of Terms</h3>
                  <p className="font-light leading-relaxed">
                    By accessing and using Zephyra, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Our Services</h3>
                  <p className="font-light leading-relaxed mb-3">
                    Zephyra provides AI-powered mental wellness support, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 font-light leading-relaxed">
                    <li><strong>AI Chatbot:</strong> Powered by <strong>Gemini 2.5 Flash</strong> for empathetic conversations.</li>
                    <li><strong>Mood Canvas:</strong> Visual expression analysis using <strong>Gemini Vision</strong>.</li>
                    <li><strong>Personalized Sessions:</strong> Custom therapy experiences with <strong>Google Lyria</strong> music and <strong>Imagen-3</strong> visuals.</li>
                    <li><strong>Anonymous Community Forum:</strong> Moderated by <strong>Gemini AI</strong> with pseudonymous identities.</li>
                    <li><strong>Reflections & Insights:</strong> AI-powered commentary on your daily reflections.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Not a Substitute for Professional Care</h3>
                  <p className="font-light leading-relaxed">
                    <strong>Important:</strong> Zephyra is designed to support your mental wellness but is <strong>not a replacement for professional medical advice, diagnosis, or treatment</strong>. If you're experiencing a mental health crisis, please contact emergency services or a qualified mental health professional immediately.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>User Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-2 font-light leading-relaxed">
                    <li>Be respectful and kind in community interactions.</li>
                    <li>Do not share harmful, abusive, or inappropriate content.</li>
                    <li>Understand that AI responses are generated and may not always be perfect.</li>
                    <li>Use the platform responsibly and in accordance with these terms.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Account and Data</h3>
                  <p className="font-light leading-relaxed">
                    We use <strong>Firebase Anonymous Authentication</strong> to protect your privacy. You're responsible for maintaining the confidentiality of your access credentials. We reserve the right to terminate accounts that violate these terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Intellectual Property</h3>
                  <p className="font-light leading-relaxed">
                    All content, features, and functionality on Zephyra are owned by us and protected by copyright, trademark, and other intellectual property laws. AI-generated content (music, images, text) is provided for your personal use within the platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Limitation of Liability</h3>
                  <p className="font-light leading-relaxed">
                    Zephyra is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform or reliance on AI-generated content.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Changes to Terms</h3>
                  <p className="font-light leading-relaxed">
                    We may update these Terms and Conditions from time to time. Continued use of Zephyra after changes constitutes acceptance of the new terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E252B' }}>Contact Us</h3>
                  <p className="font-light leading-relaxed">
                    For questions about these Terms and Conditions, please contact us at <strong>anujkamaljain1234@gmail.com</strong>
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSection;

