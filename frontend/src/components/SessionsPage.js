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
import SessionCalendar from './SessionCalendar';

const SessionsPage = () => {
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [ongoingSessions, setOngoingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduling, setShowScheduling] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [userContext, setUserContext] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionLoadingMessage, setSessionLoadingMessage] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  
  // Personalization modal states
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalizationInput, setPersonalizationInput] = useState('');
  const [pendingSessionType, setPendingSessionType] = useState(null); // 'instant' or sessionId

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadUpcomingSessions(),
        loadCurrentSchedule(),
        loadUserContext()
      ]);
      setLoading(false);
    };
    loadData();
  }, [navigate]);

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
      const response = await sessionService.getUpcomingSessions(20); // Request more to ensure we have enough
      
      
      if (response && response.success && response.sessions) {
        // Filter out cancelled sessions and expired sessions (more than 1 hour past scheduled time)
        const now = new Date();
        const validSessions = response.sessions.filter(s => {
          if (!s || s.status === 'cancelled') return false;
          
          // For scheduled sessions, check if they're expired (more than 1 hour past)
          if (s.status === 'scheduled' && s.nextSessionDate && s.schedule?.time) {
            const sessionDate = new Date(s.nextSessionDate);
            const [hours, minutes] = s.schedule.time.split(':').map(Number);
            sessionDate.setHours(hours, minutes, 0, 0);
            const timeSinceSession = now - sessionDate;
            const hoursSinceSession = Math.floor(timeSinceSession / (1000 * 60 * 60));
            if (timeSinceSession > 0 && hoursSinceSession >= 1) {
              return false; // Expired - more than 1 hour past
            }
          }
          
          return true;
        });
        
        
        // Separate active instant sessions and scheduled sessions
        const activeInstantSessions = validSessions.filter(s => 
          s.status === 'active' && s.sessionId?.startsWith('session-instant_')
        );
        const scheduledSessions = validSessions.filter(s => s.status === 'scheduled');
        
        // Separate ready-to-join scheduled sessions (within 1-hour window) from future scheduled sessions
        const readyToJoinSessions = [];
        const futureScheduledSessions = [];
        
        scheduledSessions.forEach(session => {
          if (session.nextSessionDate && session.schedule?.time) {
            const sessionDate = new Date(session.nextSessionDate);
            const [hours, minutes] = session.schedule.time.split(':').map(Number);
            sessionDate.setHours(hours, minutes, 0, 0);
            const diffTime = sessionDate - now;
            
            // If session time has passed or is now, and within 1-hour window, it's ready to join
            if (diffTime <= 0) {
              const timeSinceSession = now - sessionDate;
              const hoursSinceSession = Math.floor(timeSinceSession / (1000 * 60 * 60));
              if (timeSinceSession > 0 && hoursSinceSession < 1) {
                // Within 1-hour window - ready to join
                readyToJoinSessions.push(session);
              } else {
                // Expired - should have been filtered out, but just in case
                return;
              }
            } else {
              // Future session
              futureScheduledSessions.push(session);
            }
          } else {
            // No date/time info - treat as future
            futureScheduledSessions.push(session);
          }
        });
        
        
        // Sort future scheduled sessions by nextSessionDate (chronologically)
        const sortedFutureSessions = [...futureScheduledSessions].sort((a, b) => 
          new Date(a.nextSessionDate) - new Date(b.nextSessionDate)
        );
        
        // Show exactly 4 upcoming scheduled sessions in a 2x2 grid
        const targetSessions = 4;
        const finalScheduledSessions = sortedFutureSessions.slice(0, targetSessions);
        
        
        // Set ongoing sessions: active instant sessions + ready-to-join scheduled sessions
        setOngoingSessions([...activeInstantSessions, ...readyToJoinSessions]);
        // Set upcoming sessions: future scheduled sessions only
        setUpcomingSessions(finalScheduledSessions);
      } else {
        console.warn('Invalid response structure:', response);
      }
    } catch (error) {
      console.error('Error loading upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSchedule = async () => {
    try {
      const response = await sessionService.getSessionSchedule();
      if (response.success && response.session) {
        setCurrentSchedule(response.session);
      } else {
        setCurrentSchedule(null);
      }
    } catch (error) {
      console.error('Error loading current schedule:', error);
      setCurrentSchedule(null);
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
    // Prevent duplicate calls
    if (sessionLoading) {
      return;
    }
    
    try {
      setSessionLoading(true);
      setSessionLoadingMessage('Starting your scheduled session...');
      
      // Validate sessionId is not a virtual session
      if (sessionId && sessionId.startsWith('virtual_')) {
        setSessionLoading(false);
        alert('Cannot join virtual sessions. Please wait for the session to be created.');
        return;
      }
      
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
      console.error('Error starting scheduled session:', error);
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
      await Promise.all([
        loadUpcomingSessions(),
        loadCurrentSchedule()
      ]);
    } catch (error) {
      setSessionLoading(false);
    }
  };

  const handleSessionClose = async () => {
    if (isSessionActive && activeSession) {
      const confirmed = window.confirm('Are you sure you want to close this session? Your progress will be saved.');
      if (confirmed) {
        try {
          setSessionLoading(true);
          setSessionLoadingMessage('Saving your session progress...');
          
          // Get auth data
          const firebaseUid = userContext?.firebaseUid || localStorage.getItem('firebaseUid');
          const secretCode = userContext?.secretCode || localStorage.getItem('userSecretCode');
          
          // Close the session (updates summary, sets scheduled sessions to 'scheduled')
          await sessionService.closeSession(activeSession, firebaseUid, secretCode);
          
          // Reset session state
          setActiveSession(null);
          setIsSessionActive(false);
          setSessionLoading(false);
          
          // Reload sessions to show updated data
          await Promise.all([
            loadUpcomingSessions(),
            loadCurrentSchedule()
          ]);
        } catch (error) {
          console.error('Error closing session:', error);
          setSessionLoading(false);
          alert('Error closing session. Please try again.');
        }
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

  const handleJoin = (session) => {
    // Validate session before joining
    if (!session || !session.sessionId) {
      console.error('Invalid session in handleJoin:', session);
      alert('Invalid session. Please refresh the page.');
      return;
    }
    
    // Reject virtual sessions
    if (session.sessionId.startsWith('virtual_')) {
      alert('Cannot join virtual sessions. Please wait for the session to be created.');
      return;
    }
    
    // Handle instant sessions - they're already active, just open them directly
    if (session.sessionId.startsWith('session-instant_')) {
      setActiveSession(session.sessionId);
      setIsSessionActive(true);
      return;
    }
    
    // Handle scheduled sessions - show personalization modal first
    handleStartScheduledSession(session.sessionId);
  };

  const handleCancelInstantSession = async (sessionId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to cancel this instant session?');
      if (!confirmed) return;

      const response = await sessionService.cancelSession(sessionId);
      if (response.success) {
        // Reload sessions to update the list
        loadUpcomingSessions();
      } else {
        alert('Failed to cancel session. Please try again.');
      }
    } catch (error) {
      console.error('Error canceling instant session:', error);
      alert('Error canceling session. Please try again.');
    }
  };

  // SessionCard component with countdown timer
  const SessionCard = ({ session, index, onJoin, onCancel, formatDate, formatTime }) => {
    // Calculate time until session and determine state
    const calculateTimeUntilSession = (nextSessionDate, scheduleTime) => {
      if (!nextSessionDate || !scheduleTime) {
        return {
          status: 'upcoming',
          timeRemaining: null,
          canJoin: false,
          minutesRemaining: Infinity,
          isExpired: false
        };
      }

      const now = new Date();
      const sessionDate = new Date(nextSessionDate);

      // Parse schedule time (HH:MM format)
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);

      const diffTime = sessionDate - now;
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Calculate time since session started (negative if session time has passed)
      const timeSinceSession = now - sessionDate;
      const hoursSinceSession = Math.floor(timeSinceSession / (1000 * 60 * 60));
      const isExpired = timeSinceSession > 0 && hoursSinceSession >= 1; // Expired if more than 1 hour past

      if (isExpired) {
        // Session expired (more than 1 hour past scheduled time)
        return {
          status: 'expired',
          timeRemaining: null,
          canJoin: false,
          minutesRemaining: Infinity,
          isExpired: true
        };
      } else if (diffTime <= 0) {
        // Time has passed or is now, but within 1-hour window
        const minutesSinceSession = Math.floor(timeSinceSession / (1000 * 60));
        const minutesRemainingInWindow = 60 - minutesSinceSession;
        const secondsRemaining = 60 - Math.floor((timeSinceSession % (1000 * 60)) / 1000);
        
        if (minutesRemainingInWindow > 0) {
          return {
            status: 'ready',
            timeRemaining: { days: 0, hours: 0, minutes: minutesRemainingInWindow, seconds: secondsRemaining },
            canJoin: true,
            minutesRemaining: 0,
            isExpired: false
          };
        } else {
          // Should not reach here as expired check is above, but just in case
          return {
            status: 'expired',
            timeRemaining: null,
            canJoin: false,
            minutesRemaining: Infinity,
            isExpired: true
          };
        }
      } else if (diffMinutes <= 10) {
        // Starting soon (10 minutes or less)
        return {
          status: 'starting_soon',
          timeRemaining: { days: 0, hours: 0, minutes: diffMinutes, seconds: Math.floor((diffTime % (1000 * 60)) / 1000) },
          canJoin: false,
          minutesRemaining: diffMinutes,
          isExpired: false
        };
      } else {
        // Upcoming (more than 10 minutes)
        return {
          status: 'upcoming',
          timeRemaining: { days: diffDays, hours: diffHours % 24, minutes: diffMinutes % 60, seconds: Math.floor((diffTime % (1000 * 60)) / 1000) },
          canJoin: false,
          minutesRemaining: diffMinutes,
          isExpired: false
        };
      }
    };

    // Countdown timer hook
    // For active instant sessions, show as ready to join
    const isActiveInstant = session.status === 'active' && session.sessionId?.startsWith('session-instant_');
    const [timeData, setTimeData] = useState(() => {
      if (isActiveInstant) {
        // Active instant sessions are always ready to join
        return {
          status: 'ready',
          timeRemaining: { days: 0, hours: 0, minutes: 0, seconds: 0 },
          canJoin: true,
          minutesRemaining: 0,
          isExpired: false
        };
      }
      return calculateTimeUntilSession(session.nextSessionDate, session.schedule?.time);
    });

    useEffect(() => {
      // Skip timer for active instant sessions
      if (isActiveInstant) {
        return;
      }
      
      if (!session.nextSessionDate || !session.schedule?.time) {
        return;
      }

      const interval = setInterval(() => {
        const newTimeData = calculateTimeUntilSession(session.nextSessionDate, session.schedule.time);
        setTimeData(newTimeData);
        
        // If session expired, trigger a refresh to remove it from the list
        if (newTimeData.isExpired) {
          // Session expired, will be filtered out on next load
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [session.nextSessionDate, session.schedule?.time, isActiveInstant]);

    const formatCountdown = () => {
      if (!timeData.timeRemaining) return { primary: 'Calculating...', secondary: '' };

      const { days, hours, minutes, seconds } = timeData.timeRemaining;

      if (timeData.status === 'ready') {
        // Show remaining time in the 1-hour window
        if (minutes > 0 || hours > 0) {
          const totalMinutes = (hours || 0) * 60 + (minutes || 0);
          if (totalMinutes >= 60) {
            return { primary: 'Ready', secondary: 'to join' };
          } else {
            return { primary: `${totalMinutes}m left`, secondary: 'to join' };
          }
        }
        return { primary: 'Ready', secondary: 'to join' };
      }

      if (days > 0) {
        return { primary: `${days}d ${hours}h`, secondary: `${minutes}m` };
      } else if (hours > 0) {
        return { primary: `${hours}h ${minutes}m`, secondary: `${seconds}s` };
      } else if (minutes > 0) {
        return { primary: `${minutes}m`, secondary: `${seconds}s` };
      } else {
        return { primary: `${seconds}s`, secondary: '' };
      }
    };

    const countdownDisplay = formatCountdown();

    // Get state-based styling
    const getStateStyles = () => {
      switch (timeData.status) {
        case 'ready':
          return {
            border: 'border-2 border-green-400',
            bg: 'bg-green-50/50',
            statusColor: 'text-green-700 bg-green-100',
            statusText: 'Ready to Join'
          };
        case 'starting_soon':
          return {
            border: 'border-2 border-amber-400',
            bg: 'bg-amber-50/50',
            statusColor: 'text-amber-700 bg-amber-100',
            statusText: 'Starting Soon'
          };
        default:
          return {
            border: 'border border-white/40',
            bg: 'bg-white/80',
            statusColor: 'text-blue-600 bg-blue-100',
            statusText: 'Upcoming'
          };
      }
    };

    const stateStyles = getStateStyles();
    // For active instant sessions, always show and enable join button
    // For scheduled sessions: show button when 10 mins or less, but only enable when ready (status === 'ready')
    const showJoinButton = isActiveInstant || timeData.minutesRemaining <= 10; // Show button when 10 mins or less or for instant sessions
    // Enable button ONLY when: instant session OR session status is explicitly 'ready' (not 'starting_soon')
    const enableJoinButton = isActiveInstant || timeData.status === 'ready'; // Enable only for instant sessions or when status is 'ready'
    const isButtonDisabled = !enableJoinButton || session._isVirtual; // Explicit disabled state

    return (
      <div className="relative">
        {/* Cancel button for instant sessions */}
        {isActiveInstant && onCancel && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel(session.sessionId);
            }}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
            title="Cancel instant session"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        )}
        <div
          className={`dashboard-card ${stateStyles.bg} backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 ${stateStyles.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col`}
        >
        {/* Header Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-base font-bold">{index + 1}</span>
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: '#1E252B' }}>
                {isActiveInstant ? 'Instant Session' : `Session #${index + 1}`}
              </h3>
              <p className="text-xs text-gray-500">
                {isActiveInstant 
                  ? 'Ready to join now' 
                  : `${formatDate(session.nextSessionDate)} at ${formatTime(session.schedule?.time)}`
                }
              </p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${stateStyles.statusColor}`}>
            {stateStyles.statusText}
          </div>
        </div>

        {/* Countdown Section */}
        <div className="flex-1 flex flex-col justify-center items-center my-2 py-2 bg-white/50 rounded-lg border border-white/50">
          <div className="text-2xl font-bold text-gray-800 tracking-tight">
            {countdownDisplay.primary}
          </div>
          {countdownDisplay.secondary && (
            <div className="text-xs text-gray-500 font-medium">
              {countdownDisplay.secondary}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Prevent multiple clicks and validate session
            if (isButtonDisabled || !enableJoinButton || session._isVirtual) {
              return;
            }
            // Validate sessionId before joining - reject virtual sessions
            if (session.sessionId && session.sessionId.startsWith('virtual_')) {
              alert('Cannot join virtual sessions. Please wait for the session to be created.');
              return;
            }
            onJoin(session);
          }}
          disabled={isButtonDisabled || session._isVirtual}
          className={`
            w-full py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-300
            flex items-center justify-center space-x-2
            ${!isButtonDisabled && enableJoinButton && !session._isVirtual
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:scale-[1.02] cursor-pointer'
              : showJoinButton && !session._isVirtual && !enableJoinButton
              ? 'bg-blue-200 text-blue-700 opacity-70 cursor-not-allowed pointer-events-none'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none opacity-60'
            }
          `}
          title={session._isVirtual ? 'This session will be created when the previous one is completed' : (!enableJoinButton && showJoinButton ? 'Session will start soon' : enableJoinButton ? 'Click to join session' : '')}
        >
          {session._isVirtual ? (
            <>
              <ClockIcon className="w-4 h-4" />
              <span>Scheduled</span>
            </>
          ) : showJoinButton ? (
            <>
              <PlayIcon className="w-4 h-4" />
              <span>{enableJoinButton ? 'Join Session' : 'Starting Soon'}</span>
            </>
          ) : (
            <>
              <ClockIcon className="w-4 h-4" />
              <span>Wait to Start</span>
            </>
          )}
        </button>
        </div>
      </div>
    );
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
          <div className="dashboard-card bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all relative">
            {/* Header with title and close button */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                ✨ Personalize Your Session
              </h3>
              <button
                onClick={() => setShowPersonalizationModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 ml-4"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                disabled={!personalizationInput.trim()}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
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
          <div className="dashboard-card bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md mx-4 text-center shadow-2xl">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#1E252B' }}>
              Your Wellness Sessions
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Welcome back! Here's your session schedule.
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={handleStartInstantSession}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg hover:shadow-xl transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              <div className="flex items-center space-x-2">
                <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Instant</span>
              </div>
            </button>
            <button
              onClick={() => setShowScheduling(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg hover:shadow-xl transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
            >
              <div className="flex items-center space-x-2">
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Schedule</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Upcoming Sessions */}
          <div className="lg:col-span-2 space-y-6 min-h-[600px]">
            {/* Ongoing Sessions Section */}
            {ongoingSessions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <PlayIcon className="w-6 h-6 mr-2 text-green-600" />
                  Ongoing Sessions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ongoingSessions.map((session, index) => (
                    <SessionCard
                      key={session.sessionId}
                      session={session}
                      index={index}
                      onJoin={handleJoin}
                      onCancel={handleCancelInstantSession}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Sessions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <ClockIcon className="w-6 h-6 mr-2 text-blue-600" />
                  Upcoming Sessions
                </h2>
              </div>

              {/* Upcoming Sessions List */}
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CalendarDaysIcon className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#1E252B' }}>
                    No Scheduled Sessions
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#475569' }}>
                    Schedule your first wellness session to get started
                  </p>
                  <button
                    onClick={() => setShowScheduling(true)}
                    className="px-4 py-2 text-sm text-white rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
                  >
                    Schedule Session
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map((session, index) => (
                    <SessionCard
                      key={session.sessionId}
                      session={session}
                      index={index}
                      onJoin={handleJoin}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calendar & History */}
          <div className="space-y-8">
            {/* Calendar Widget */}
            <div className="dashboard-card bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <div className="flex items-center mb-4">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800">Calendar</h2>
              </div>
              <div className="h-[300px]">
                <SessionCalendar 
                  currentSchedule={currentSchedule} 
                  upcomingSessions={[...ongoingSessions, ...upcomingSessions]} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SessionScheduling
        isOpen={showScheduling}
        onClose={() => {
          setShowScheduling(false);
          Promise.all([
            loadUpcomingSessions(),
            loadCurrentSchedule()
          ]); // Refresh the list
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
