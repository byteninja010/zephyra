import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import SignInPage from './components/SignInPage';
import SecretCodeModal from './components/SecretCodeModal';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Home Route */}
          <Route path="/" element={<HeroSection />} />
          
          {/* Sign-in Route */}
          <Route path="/signin" element={<SignInPage />} />
          
          {/* Secret Code Display Route */}
          <Route path="/secret-code" element={<SecretCodeModal />} />
          
          {/* Dashboard Route */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
