import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import sessionService from '../services/sessionService';
import SessionScheduling from './SessionScheduling';
import SimpleSessionInterface from './SimpleSessionInterface';

const SessionsPage = () => {
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduling, setShowScheduling] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [userContext, setUserContext] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionLoadingMessage, setSessionLoadingMessage] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Personalization modal states
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalizationInput, setPersonalizationInput] = useState('');
  const [pendingSessionType, setPendingSessionType] = useState(null); // 'instant' or sessionId

  useEffect(() => {
    loadUpcomingSessions();
    loadUserContext();
  }, []);

  // Prevent navigation during session operations
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionLoading || isSessionActive) {
        e.preventDefault();
        e.returnValue = 'You have an active session. Are you sure you want to leave?';
        return 'You have an active session. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionLoading, isSessionActive]);

  const loadUpcomingSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionService.getUpcomingSessions(5);
      if (response.success) {
        setUpcomingSessions(response.sessions);
      }
    } catch (error) {
      console.error('Error loading upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserContext = async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const secretCode = localStorage.getItem('userSecretCode');
      
      const response = await sessionService.getSessionSchedule();
      if (response.success && response.session) {
        const context = {
          firebaseUid,
          secretCode,
          lastSessionSummary: response.session.lastSessionSummary
        };
        setUserContext(context);
      } else {
        // Even if no session, set basic context
        const context = {
          firebaseUid,
          secretCode,
          lastSessionSummary: null
        };
        setUserContext(context);
      }
    } catch (error) {
      // Set basic context even on error
      const firebaseUid = localStorage.getItem('firebaseUid');
      const secretCode = localStorage.getItem('userSecretCode');
      setUserContext({
        firebaseUid,
        secretCode,
        lastSessionSummary: null
      });
    }
  };

  const handleStartInstantSession = () => {
    // Show personalization modal first
    setPendingSessionType('instant');
    setPersonalizationInput('');
    setShowPersonalizationModal(true);
  };

  const proceedWithInstantSession = async (customPreferences = '') => {
    try {
      setSessionLoading(true);
      setSessionLoadingMessage('Initializing your wellness session...');
      
      // Ensure we have a valid userContext
      const contextToSend = userContext || {
        firebaseUid: localStorage.getItem('firebaseUid'),
        lastSessionSummary: null
      };
      
      // Add custom preferences if provided
      if (customPreferences) {
        contextToSend.customPreferences = customPreferences;
      }
      
      setSessionLoadingMessage('Creating your personalized session...');
      const response = await sessionService.startInstantSession(contextToSend);
      
      if (response.success) {
        setSessionLoadingMessage('Session ready! Loading interface...');
        
        // Small delay to show loading message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setActiveSession(response.session.sessionId);
        setIsSessionActive(true);
        setSessionLoading(false);
      } else {
        setSessionLoading(false);
        alert('Failed to start session. Please try again.');
      }
    } catch (error) {
      setSessionLoading(false);
      alert('Error starting session. Please try again.');
    }
  };

  const handleStartScheduledSession = (sessionId) => {
    // Show personalization modal first
    setPendingSessionType(sessionId);
    setPersonalizationInput('');
    setShowPersonalizationModal(true);
  };

  const proceedWithScheduledSession = async (sessionId, customPreferences = '') => {
    try {
      setSessionLoading(true);
      setSessionLoadingMessage('Starting your scheduled session...');
      
      // Add custom preferences to userContext if provided
      const contextToSend = { ...userContext };
      if (customPreferences) {
        contextToSend.customPreferences = customPreferences;
      }
      
      const response = await sessionService.startSession(sessionId, contextToSend);
      if (response.success) {
        setSessionLoadingMessage('Session ready! Loading interface...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setActiveSession(response.session.sessionId);
        setIsSessionActive(true);
        setSessionLoading(false);
      } else {
        setSessionLoading(false);
        alert('Failed to start scheduled session. Please try again.');
      }
    } catch (error) {
      setSessionLoading(false);
      alert('Error starting scheduled session. Please try again.');
    }
  };

  const handlePersonalizationConfirm = () => {
    setShowPersonalizationModal(false);
    
    if (pendingSessionType === 'instant') {
      proceedWithInstantSession(personalizationInput.trim());
    } else {
      // It's a scheduled session
      proceedWithScheduledSession(pendingSessionType, personalizationInput.trim());
    }
  };

  const handlePersonalizationSkip = () => {
    setShowPersonalizationModal(false);
    
    if (pendingSessionType === 'instant') {
      proceedWithInstantSession('');
    } else {
      proceedWithScheduledSession(pendingSessionType, '');
    }
  };

  const handleCleanupSessions = async () => {
    try {
      const confirmed = window.confirm('This will remove duplicate sessions. Continue?');
      if (!confirmed) return;

      const response = await sessionService.cleanupSessions();
      if (response.success) {
        alert(`Cleaned up ${response.deletedCount} duplicate sessions`);
        loadUpcomingSessions(); // Reload the sessions list
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      alert('Error cleaning up sessions. Please try again.');
    }
  };

  const handleSessionComplete = async (sessionId) => {
    try {
      setSessionLoading(true);
      setSessionLoadingMessage('Completing your session and generating summary...');
      
      // This will be called from SimpleSessionInterface
      
      // Reset session state
      setActiveSession(null);
      setIsSessionActive(false);
      setSessionLoading(false);
      
      // Reload sessions to show updated data
      loadUpcomingSessions();
    } catch (error) {
      setSessionLoading(false);
    }
  };

  const handleSessionClose = () => {
    if (isSessionActive) {
      const confirmed = window.confirm('Are you sure you want to close this session? Your progress will be saved.');
      if (confirmed) {
        setActiveSession(null);
        setIsSessionActive(false);
      }
    } else {
      setActiveSession(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'No time set';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: '#475569' }}>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
      {/* Personalization Modal */}
      {showPersonalizationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
              ✨ Personalize Your Session
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Do you have anything specific in mind for your session's background or music? 
              Share your preferences, and we'll create a truly personalized experience for you!
            </p>
            
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Your Preferences (Optional)
              </label>
              <textarea
                value={personalizationInput}
                onChange={(e) => setPersonalizationInput(e.target.value)}
                placeholder="E.g., 'I'd love a peaceful ocean scene with gentle waves and calming piano music' or 'A forest scene with birds chirping and soft guitar'"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="4"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Describe any visual scenes, colors, sounds, or instruments you'd like
              </p>
            </div>
            
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handlePersonalizationSkip}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Skip
              </button>
              <button
                onClick={handlePersonalizationConfirm}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                {personalizationInput.trim() ? 'Personalize' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {sessionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-3 sm:mb-4"></div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Loading Session</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{sessionLoadingMessage}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-800 transition-all duration-300 mb-6 sm:mb-8 transform hover:scale-105 hover:-translate-x-1 group"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300"
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
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-4" style={{ color: '#1E252B' }}>
            Your Wellness Sessions
            <span
              className="block mt-2"
              style={{
                background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Scheduled & Ready
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto px-4" style={{ color: '#475569' }}>
            Manage your scheduled wellness sessions and start instant sessions for immediate support.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
          <button
            onClick={handleStartInstantSession}
            className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            <div className="flex items-center justify-center space-x-2">
              <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Start Instant Session</span>
            </div>
          </button>
          
          <button
            onClick={() => setShowScheduling(true)}
            className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            <div className="flex items-center justify-center space-x-2">
              <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Schedule New Session</span>
            </div>
          </button>

          {upcomingSessions.length > 2 && (
            <button
              onClick={handleCleanupSessions}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Clean Up Duplicates</span>
              </div>
            </button>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8" style={{ color: '#1E252B' }}>
            Upcoming Sessions
          </h2>
          
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <CalendarDaysIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" style={{ color: '#1E252B' }}>
                No Scheduled Sessions
              </h3>
              <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6" style={{ color: '#475569' }}>
                Schedule your first wellness session to get started
              </p>
              <button
                onClick={() => setShowScheduling(true)}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                Schedule Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {upcomingSessions.map((session, index) => (
                <div
                  key={session.sessionId}
                  className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm sm:text-base font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold" style={{ color: '#1E252B' }}>
                          Session #{index + 1}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleStartScheduledSession(session.sessionId)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                        title="Start Session"
                      >
                        <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#3C91C5' }} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#64748B' }} />
                      <span className="text-xs sm:text-sm" style={{ color: '#475569' }}>
                        {formatDate(session.nextSessionDate)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#64748B' }} />
                      <span className="text-xs sm:text-sm" style={{ color: '#475569' }}>
                        {formatTime(session.schedule?.time)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>
                        Frequency:
                      </span>
                      <span className="text-xs sm:text-sm capitalize" style={{ color: '#475569' }}>
                        {session.schedule?.frequency || 'Not set'}
                      </span>
                    </div>
                    
                    {session.schedule?.days && session.schedule.days.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>
                          Days:
                        </span>
                        <span className="text-xs sm:text-sm" style={{ color: '#475569' }}>
                          {session.schedule.days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>
                        Next Session:
                      </span>
                      <span className="text-xs sm:text-sm font-semibold" style={{ color: '#475569' }}>
                        {formatDate(session.nextSessionDate)}
                      </span>
                    </div>
                  </div>

                  {session.lastSessionSummary && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                      <h4 className="text-xs sm:text-sm font-medium mb-2" style={{ color: '#64748B' }}>
                        Last Session Summary:
                      </h4>
                      <p className="text-xs sm:text-sm" style={{ color: '#475569' }}>
                        {session.lastSessionSummary.length > 100 
                          ? `${session.lastSessionSummary.substring(0, 100)}...`
                          : session.lastSessionSummary
                        }
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SessionScheduling
        isOpen={showScheduling}
        onClose={() => {
          setShowScheduling(false);
          loadUpcomingSessions(); // Refresh the list
        }}
      />

      {activeSession && (
        <SimpleSessionInterface
          sessionId={activeSession}
          onClose={handleSessionClose}
          onComplete={handleSessionComplete}
          userContext={userContext}
        />
      )}
    </div>
  );
};

export default SessionsPage;
