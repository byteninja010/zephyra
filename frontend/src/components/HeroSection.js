import React from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/signup');
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
      <nav className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            {/* Logo */}
              <div className="flex items-center space-x-0.5">
                <img 
                  src="/logo.png" 
                  alt="Zephyra Logo" 
                  className="w-16 h-14 object-contain"
                />
                <h1 className="text-2xl font-bold" style={{ color: '#1E252B' }}>Zephyra</h1>
              </div>
            
            {/* Navigation Items */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#about" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>About</a>
              <a href="#features" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Features</a>
              <a href="#resources" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Resources</a>
              <a href="#contact" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Contact</a>
              <button 
                onClick={() => navigate('/auth/login')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Main Headline */}
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight" style={{ color: '#1E252B' }}>
                  Your Safe Space for
                  <span className="block mt-2" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Support, Anytime
                  </span>
                </h1>
                <p className="text-xl md:text-2xl font-light leading-relaxed" style={{ color: '#2C363E' }}>
                  Check in with your mood, talk to our chatbot, or get crisis help — all in one place.
                </p>
              </div>

              {/* CTA Button */}
              <div className="pt-4">
                <button
                  onClick={handleGetStarted}
                  className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-semibold text-white rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                    boxShadow: '0 20px 40px rgba(60, 145, 197, 0.4)'
                  }}
                >
                  <span className="relative z-10">Begin Your Journey</span>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, #2C363E 0%, #475569 100%)' }}></div>
                  <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                
                {/* Powered by Gemini */}
                <div className="mt-4 flex">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 shadow-lg border border-white/20">                 
                    <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      Powered by
                    </span>
                    <img 
                      src="/Google_Gemini_logo.png" 
                      alt="Gemini AI" 
                      className="w-10 object-contain"
                    />
                    <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      - AI with care
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Assurance Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
                <div className="flex flex-col items-center space-y-2 p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)' }}>
                    <svg className="w-6 h-6" fill="none" stroke="#E65100" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: '#475569' }}>Simple Mood Check-ins</span>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)' }}>
                    <svg className="w-6 h-6" fill="none" stroke="#7B1FA2" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 13.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: '#475569' }}>Chat Anytime</span>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)' }}>
                    <svg className="w-6 h-6" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: '#475569' }}>Track Your Well-Being</span>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-xl backdrop-blur-sm border border-white/30" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFCDD2 0%, #EF9A9A 100%)' }}>
                    <svg className="w-6 h-6" fill="none" stroke="#C62828" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: '#475569' }}>Crisis Support 24/7</span>
                </div>
              </div>
            </div>

            {/* Right Side - Calming Illustration */}
            <div className="relative">
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
      <div id="features" className="relative z-10 py-20" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#1E252B' }}>Why Choose Us?</h2>
            <p className="text-lg font-light max-w-2xl mx-auto" style={{ color: '#475569' }}>
              Comprehensive mental health support designed with care and powered by advanced AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#1976D2" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#1E252B' }}>Sessions & Routines</h3>
              <p className="text-sm font-light" style={{ color: '#475569' }}>Stay on track with guided sessions and personalized routines that adapt to your needs.</p>
            </div>

            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#F57C00" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#1E252B' }}>Personalized Activities</h3>
              <p className="text-sm font-light" style={{ color: '#475569' }}>Reflections, exercises, and grounding techniques tailored to your mental wellness journey.</p>
            </div>

            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#1E252B' }}>Mood Insights</h3>
              <p className="text-sm font-light" style={{ color: '#475569' }}>Emoji-based mood graphs and insights to help you understand your emotional patterns.</p>
            </div>

            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#C62828" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#1E252B' }}>Instant Help</h3>
              <p className="text-sm font-light" style={{ color: '#475569' }}>Crisis button always within reach for immediate support when you need it most.</p>
            </div>

            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)' }}>
                <img 
                  src="/Google_Gemini_logo.png" 
                  alt="Gemini AI" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center" style={{ color: '#1E252B' }}>Powered by Gemini</h3>
              <p className="text-sm font-light text-center" style={{ color: '#475569' }}>Gentle, smart support that adapts to you and provides compassionate AI-powered assistance.</p>
            </div>

            <div className="group p-8 rounded-2xl backdrop-blur-sm border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
              <div  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#00695C" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#1E252B' }}>Privacy First</h3>
              <p className="text-sm font-light" style={{ color: '#475569' }}>Your data is encrypted and secure. Your privacy and safety are our top priorities.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/20" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <a href="#privacy" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Privacy</a>
              <a href="#recovery" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Recovery Code</a>
              <a href="#resources" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#475569' }}>Resources</a>
            </div>
            <p className="text-sm font-light" style={{ color: '#475569' }}>
              Your safety and privacy come first.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HeroSection;

