import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import HeroSection from './components/HeroSection';
import AuthPage from './components/AuthPage';
import SecretCodeModal from './components/SecretCodeModal';
import Dashboard from './components/Dashboard';
import OnboardingFlow from './components/OnboardingFlow';
import ChatInterface from './components/ChatInterface';
import SessionsPage from './components/SessionsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
          {/* Home Route */}
          <Route path="/" element={<HeroSection />} />
          
          {/* Auth Route - Unified Login/Signup */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/login" element={<AuthPage initialMode="login" />} />
          <Route path="/auth/signup" element={<AuthPage initialMode="signup" />} />
          
          {/* Secret Code Display Route */}
          <Route path="/secret-code" element={<SecretCodeModal />} />
          
          {/* Onboarding Route */}
          <Route path="/onboarding" element={<OnboardingFlow />} />
          
          {/* Dashboard Route */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Chat Route */}
          <Route path="/chat" element={<ChatInterface />} />
          
          {/* Sessions Route */}
          <Route path="/sessions" element={<SessionsPage />} />
          
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
