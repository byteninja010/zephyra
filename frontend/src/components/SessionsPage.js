import React, { useState, useEffect } from 'react';
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
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduling, setShowScheduling] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [userContext, setUserContext] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionLoadingMessage, setSessionLoadingMessage] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    console.log('🎯 SessionsPage component mounted');
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
      
      console.log('🔍 SessionsPage loadUserContext - firebaseUid:', firebaseUid);
      console.log('🔍 SessionsPage loadUserContext - secretCode:', secretCode);
      
      const response = await sessionService.getSessionSchedule();
      if (response.success && response.session) {
        const context = {
          firebaseUid,
          secretCode,
          lastSessionSummary: response.session.lastSessionSummary
        };
        console.log('🔍 SessionsPage loadUserContext - setting context:', context);
        setUserContext(context);
      } else {
        // Even if no session, set basic context
        const context = {
          firebaseUid,
          secretCode,
          lastSessionSummary: null
        };
        console.log('🔍 SessionsPage loadUserContext - setting basic context:', context);
        setUserContext(context);
      }
    } catch (error) {
      console.error('Error loading user context:', error);
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

  const handleStartInstantSession = async () => {
    try {
      console.log('🚀 Starting instant session...');
      setSessionLoading(true);
      setSessionLoadingMessage('Initializing your wellness session...');
      
      // Ensure we have a valid userContext
      const contextToSend = userContext || {
        firebaseUid: localStorage.getItem('firebaseUid'),
        lastSessionSummary: null
      };
      
      console.log('Context to send:', contextToSend);
      
      setSessionLoadingMessage('Creating your personalized session...');
      const response = await sessionService.startInstantSession(contextToSend);
      console.log('Session response:', response);
      
      if (response.success) {
        console.log('✅ Session started successfully:', response.session.sessionId);
        setSessionLoadingMessage('Session ready! Loading interface...');
        
        // Small delay to show loading message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setActiveSession(response.session.sessionId);
        setIsSessionActive(true);
        setSessionLoading(false);
      } else {
        console.error('❌ Session start failed:', response);
        setSessionLoading(false);
        alert('Failed to start session. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error starting instant session:', error);
      setSessionLoading(false);
      alert('Error starting session. Please try again.');
    }
  };

  const handleStartScheduledSession = async (sessionId) => {
    try {
      setSessionLoading(true);
      setSessionLoadingMessage('Starting your scheduled session...');
      
      const response = await sessionService.startSession(sessionId, userContext);
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
      console.error('Error starting scheduled session:', error);
      setSessionLoading(false);
      alert('Error starting scheduled session. Please try again.');
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
      console.log('Session completed:', sessionId);
      
      // Reset session state
      setActiveSession(null);
      setIsSessionActive(false);
      setSessionLoading(false);
      
      // Reload sessions to show updated data
      loadUpcomingSessions();
    } catch (error) {
      console.error('Error completing session:', error);
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
      {/* Loading Overlay */}
      {sessionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Session</h3>
            <p className="text-gray-600 mb-4">{sessionLoadingMessage}</p>
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1E252B' }}>
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
          <p className="text-lg font-light max-w-2xl mx-auto" style={{ color: '#475569' }}>
            Manage your scheduled wellness sessions and start instant sessions for immediate support.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={handleStartInstantSession}
            className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            <div className="flex items-center space-x-2">
              <PlayIcon className="w-6 h-6" />
              <span>Start Instant Session</span>
            </div>
          </button>
          
          <button
            onClick={() => setShowScheduling(true)}
            className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            <div className="flex items-center space-x-2">
              <PlusIcon className="w-6 h-6" />
              <span>Schedule New Session</span>
            </div>
          </button>

          {upcomingSessions.length > 2 && (
            <button
              onClick={handleCleanupSessions}
              className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              <div className="flex items-center space-x-2">
                <TrashIcon className="w-5 h-5" />
                <span>Clean Up Duplicates</span>
              </div>
            </button>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: '#1E252B' }}>
            Upcoming Sessions
          </h2>
          
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <CalendarDaysIcon className="w-12 h-12" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: '#1E252B' }}>
                No Scheduled Sessions
              </h3>
              <p className="text-lg mb-6" style={{ color: '#475569' }}>
                Schedule your first wellness session to get started
              </p>
              <button
                onClick={() => setShowScheduling(true)}
                className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                Schedule Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session, index) => (
                <div
                  key={session.sessionId}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: '#1E252B' }}>
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
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Start Session"
                      >
                        <PlayIcon className="w-5 h-5" style={{ color: '#3C91C5' }} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className="w-5 h-5" style={{ color: '#64748B' }} />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        {formatDate(session.nextSessionDate)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-5 h-5" style={{ color: '#64748B' }} />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        {formatTime(session.schedule?.time)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                        Frequency:
                      </span>
                      <span className="text-sm capitalize" style={{ color: '#475569' }}>
                        {session.schedule?.frequency || 'Not set'}
                      </span>
                    </div>
                    
                    {session.schedule?.days && session.schedule.days.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                          Days:
                        </span>
                        <span className="text-sm" style={{ color: '#475569' }}>
                          {session.schedule.days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                        Next Session:
                      </span>
                      <span className="text-sm font-semibold" style={{ color: '#475569' }}>
                        {formatDate(session.nextSessionDate)}
                      </span>
                    </div>
                  </div>

                  {session.lastSessionSummary && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#64748B' }}>
                        Last Session Summary:
                      </h4>
                      <p className="text-sm" style={{ color: '#475569' }}>
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
