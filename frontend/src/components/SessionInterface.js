import React, { useState, useEffect, useRef } from 'react';
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import sessionService from '../services/sessionService';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const SessionInterface = ({ sessionId, onClose, onComplete, userContext: propUserContext }) => {
  const { getAuthData } = useAuth();
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState('greeting');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [showBackground, setShowBackground] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [userContext, setUserContext] = useState(null);
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  const sessionSteps = [
    'greeting',
    'moodCheckIn',
    'exploration',
    'copingTool',
    'reflection',
    'closure'
  ];

  useEffect(() => {
    loadSession();
    loadUserContext();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSession = async () => {
    try {
      // For now, we'll simulate loading session data
      // In a real implementation, you'd fetch this from the backend
      setSession({
        sessionId,
        backgroundImage: null,
        greeting: "Welcome to your personalized wellness session! I'm here to support you today.",
        status: 'active'
      });
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const loadUserContext = async () => {
    try {
      const firebaseUid = localStorage.getItem('firebaseUid');
      const response = await authService.getUser(firebaseUid);
      if (response.success) {
        setUserContext(response.user);
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  };

  const handleNextStep = () => {
    const currentIndex = sessionSteps.indexOf(currentStep);
    if (currentIndex < sessionSteps.length - 1) {
      setCurrentStep(sessionSteps[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = sessionSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(sessionSteps[currentIndex - 1]);
    }
  };

  const handleMoodSubmit = async () => {
    if (!mood) return;
    
    setIsLoading(true);
    try {
      await sessionService.updateSession(sessionId, 'moodCheckIn', {
        mood,
        note: moodNote
      });
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `I see you're feeling ${mood}${moodNote ? ` - ${moodNote}` : ''}. Thank you for sharing that with me.`,
        sender: 'ai',
        timestamp: new Date()
      }]);
      
      handleNextStep();
    } catch (error) {
      console.error('Error updating mood:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Generate AI response using the existing chat functionality
      const response = await authService.sendChatMessage(
        'session-chat', // Use a special chat ID for sessions
        inputMessage,
        'text',
        false,
        sessionId // Pass the sessionId for proper session chat detection
      );
      
      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.message,
          sender: 'ai',
          timestamp: new Date(),
          audioUrl: response.audioUrl
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Update session exploration data
        await sessionService.updateSession(sessionId, 'exploration', {
          userMessage: inputMessage,
          aiResponse: response.message
        });
        
        // Play audio if available
        if (response.audioUrl) {
          playAudio(response.audioUrl);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCopingTool = async () => {
    setIsLoading(true);
    try {
      const copingTools = [
        {
          type: 'breathing',
          exercise: 'Let\'s try the 4-7-8 breathing technique. Breathe in for 4 counts, hold for 7 counts, and exhale for 8 counts. Repeat this cycle 4 times.',
          audioUrl: null
        },
        {
          type: 'visualization',
          exercise: 'Imagine yourself in a peaceful place - perhaps a quiet beach or a serene forest. Focus on the sounds, smells, and sensations of this place.',
          audioUrl: null
        },
        {
          type: 'journaling',
          exercise: 'Take a moment to write down three things you\'re grateful for today. Even small moments of joy can make a big difference.',
          audioUrl: null
        }
      ];
      
      const randomTool = copingTools[Math.floor(Math.random() * copingTools.length)];
      
      await sessionService.updateSession(sessionId, 'copingTool', randomTool);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Here's a coping exercise for you: ${randomTool.exercise}`,
        sender: 'ai',
        timestamp: new Date(),
        audioUrl: randomTool.audioUrl
      }]);
      
      handleNextStep();
    } catch (error) {
      console.error('Error generating coping tool:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReflection = async () => {
    setIsLoading(true);
    try {
      const reflection = {
        summary: `Today we discussed your mood (${mood}) and explored your thoughts and feelings. We also practiced a coping technique together.`,
        keyInsights: [
          'You showed courage in sharing your feelings',
          'You\'re taking positive steps toward wellness',
          'You have the strength to work through challenges'
        ],
        nextSteps: [
          'Continue practicing the coping techniques we discussed',
          'Check in with yourself regularly',
          'Remember that it\'s okay to ask for support when needed'
        ]
      };
      
      await sessionService.updateSession(sessionId, 'reflection', reflection);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Let me summarize our session: ${reflection.summary}\n\nKey insights: ${reflection.keyInsights.join(', ')}\n\nNext steps: ${reflection.nextSteps.join(', ')}`,
        sender: 'ai',
        timestamp: new Date()
      }]);
      
      handleNextStep();
    } catch (error) {
      console.error('Error generating reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeSession = async () => {
    setIsLoading(true);
    try {
      const summary = `Session completed with mood check-in (${mood}), exploration phase, coping tool practice, and reflection.`;
      
      // Get auth data from context (most reliable) - same pattern as SimpleSessionInterface
      const authData = getAuthData();
      const firebaseUid = authData.firebaseUid || propUserContext?.firebaseUid || userContext?.firebaseUid || localStorage.getItem('firebaseUid');
      const secretCode = authData.secretCode || propUserContext?.secretCode || localStorage.getItem('userSecretCode');
      
      console.log('🔍 SessionInterface completeSession - authData:', authData);
      console.log('🔍 SessionInterface completeSession - firebaseUid:', firebaseUid);
      console.log('🔍 SessionInterface completeSession - secretCode:', secretCode);
      console.log('🔍 SessionInterface completeSession - propUserContext:', propUserContext);
      console.log('🔍 SessionInterface completeSession - userContext:', userContext);
      
      if (!firebaseUid && !secretCode) {
        throw new Error('User authentication not found. Please login again.');
      }
      
      await sessionService.completeSession(sessionId, summary, firebaseUid, secretCode);
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Thank you for taking the time for this session. Remember, I\'m always here when you need support. Take care of yourself!',
        sender: 'ai',
        timestamp: new Date()
      }]);
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioUrl) => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setCurrentPlayingAudio(audioUrl);
      }).catch((error) => {
        console.error("Error playing audio:", error);
      });
    }
  };

  const toggleAudioPlayback = (audioUrl) => {
    if (currentPlayingAudio === audioUrl && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayingAudio(null);
    } else {
      playAudio(audioUrl);
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 'greeting': return 'Welcome';
      case 'moodCheckIn': return 'How are you feeling?';
      case 'exploration': return 'Let\'s talk';
      case 'copingTool': return 'Coping Exercise';
      case 'reflection': return 'Reflection';
      case 'closure': return 'Session Complete';
      default: return step;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'greeting':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
              <span className="text-4xl">🌱</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                Welcome to Your Session
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                {session?.greeting || "I'm here to support you today. Let's begin with a gentle check-in."}
              </p>
            </div>
            <button
              onClick={handleNextStep}
              className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
            >
              <div className="flex items-center space-x-2">
                <span>Let's Begin</span>
                <ArrowRightIcon className="w-5 h-5" />
              </div>
            </button>
          </div>
        );

      case 'moodCheckIn':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                How are you feeling right now?
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                Take a moment to check in with yourself
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {['😢', '😔', '😐', '😊', '😄'].map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => setMood(emoji)}
                    className={`p-4 rounded-xl text-3xl transition-all ${
                      mood === emoji ? 'ring-4 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#475569' }}>
                  Any additional thoughts? (optional)
                </label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              
              <button
                onClick={handleMoodSubmit}
                disabled={!mood || isLoading}
                className="w-full px-6 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 'exploration':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                Let's talk about what's on your mind
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                Share whatever feels right to you
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-2xl ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      {message.audioUrl && (
                        <button
                          onClick={() => toggleAudioPlayback(message.audioUrl)}
                          className="mt-2 p-1 rounded-lg hover:bg-white/20"
                        >
                          {isPlaying && currentPlayingAudio === message.audioUrl ? (
                            <SpeakerXMarkIcon className="w-4 h-4" />
                          ) : (
                            <SpeakerWaveIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
                >
                  Send
                </button>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <div className="flex items-center space-x-2">
                    <span>Continue</span>
                    <ArrowRightIcon className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'copingTool':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                Let's try a coping exercise
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                I'll suggest a technique that might help you feel better
              </p>
            </div>
            
            <div className="text-center">
              <button
                onClick={generateCopingTool}
                disabled={isLoading}
                className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                {isLoading ? 'Generating...' : 'Get Coping Exercise'}
              </button>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <div className="flex items-center space-x-2">
                  <span>Continue</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </button>
            </div>
          </div>
        );

      case 'reflection':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                Let's reflect on our session
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                I'll help you process what we've discussed
              </p>
            </div>
            
            <div className="text-center">
              <button
                onClick={generateReflection}
                disabled={isLoading}
                className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                {isLoading ? 'Generating...' : 'Generate Reflection'}
              </button>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <div className="flex items-center space-x-2">
                  <span>Continue</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </div>
              </button>
            </div>
          </div>
        );

      case 'closure':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#1E252B' }}>
                Session Complete
              </h3>
              <p className="text-lg" style={{ color: '#475569' }}>
                Thank you for taking the time for this session
              </p>
            </div>
            
            <div className="text-center">
              <button
                onClick={completeSession}
                disabled={isLoading}
                className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                {isLoading ? 'Completing...' : 'Complete Session'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Making Your Session Personalized...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: showBackground && session.backgroundImage 
          ? `url(${session.backgroundImage}) center/cover` 
          : 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)'
      }}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold" style={{ color: '#1E252B' }}>
              {getStepTitle(currentStep)}
            </h2>
            <div className="flex items-center space-x-2">
              {sessionSteps.map((step, index) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    sessionSteps.indexOf(currentStep) >= index
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBackground(!showBackground)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              title={showBackground ? 'Hide background' : 'Show background'}
            >
              {showBackground ? (
                <EyeSlashIcon className="w-5 h-5" style={{ color: '#475569' }} />
              ) : (
                <EyeIcon className="w-5 h-5" style={{ color: '#475569' }} />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" style={{ color: '#475569' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          {renderStepContent()}
        </div>
      </div>

      {/* Audio Player */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentPlayingAudio(null);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        className="hidden"
      />
    </div>
  );
};

export default SessionInterface;
