import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
  MicrophoneIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import sessionService from '../services/sessionService';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const SimpleSessionInterface = ({ sessionId, onClose, onComplete, userContext }) => {
  const { getAuthData } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [showMoodCheckIn, setShowMoodCheckIn] = useState(true);
  const [moodNote, setMoodNote] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(135deg, #4ade80 0%, #22c55e 100%)');
  const [backgroundMusic, setBackgroundMusic] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3); // Default 30% volume
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Function to get mood-based gradient
  const getMoodGradient = (mood) => {
    const gradients = {
      '😢': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #c9b8e8 100%)', // Soft lavender
      '😔': 'linear-gradient(135deg, #ffd89b 0%, #f7a593 50%, #ffc3a0 100%)', // Warm sunset
      '😐': 'linear-gradient(135deg, #d4e6f1 0%, #a9cce3 50%, #aed6f1 100%)', // Neutral zen
      '😊': 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 50%, #b8e986 100%)', // Sunny meadow
      '😄': 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #fed766 100%)', // Joyful spring
      'anxious': 'linear-gradient(135deg, #a8dadc 0%, #90be6d 50%, #b5e7a0 100%)', // Forest green
      'stressed': 'linear-gradient(135deg, #81c784 0%, #4db6ac 50%, #66bb6a 100%)', // Stream green
      'sad': 'linear-gradient(135deg, #b2dfdb 0%, #80cbc4 50%, #a0c4c4 100%)', // Rainy greenhouse
      'happy': 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 50%, #aed581 100%)', // Bamboo forest
      'calm': 'linear-gradient(135deg, #c3e6cb 0%, #a5d8d8 50%, #b8e6e0 100%)', // Japanese garden
      'angry': 'linear-gradient(135deg, #b3cde0 0%, #9fa8da 50%, #b39ddb 100%)', // Dusk sky
      'tired': 'linear-gradient(135deg, #ffe4b5 0%, #ffd8a8 50%, #ffcc99 100%)', // Golden hour
      'excited': 'linear-gradient(135deg, #fff59d 0%, #ffee58 50%, #ffd54f 100%)', // Sunrise hills
      'shared': 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 50%, #b8e986 100%)', // Shared/Connected (Sunny meadow)
      'grateful': 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #fed766 100%)', // Grateful (Joyful spring)
      'lonely': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #c9b8e8 100%)', // Lonely (Soft lavender)
      'hopeful': 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 50%, #b8e986 100%)', // Hopeful (Sunny meadow)
      'overwhelmed': 'linear-gradient(135deg, #a8dadc 0%, #90be6d 50%, #b5e7a0 100%)' // Overwhelmed (Forest green)
    };
    
    return gradients[mood] || gradients['calm'];
  };

  const loadSession = useCallback(async () => {
    try {
      // Load actual session data from backend
      const response = await sessionService.getSession(sessionId);
      
      if (response.success && response.session) {
        setSession(response.session);
        
        // Check if we have an AI-generated image or mood-based gradient
        if (response.session.backgroundImage) {
          // Check if it's a generated image (data URL or regular URL)
          if (response.session.backgroundType === 'gemini-image' || response.session.backgroundType === 'generated-image') {
            const imageUrl = response.session.backgroundImage;
            
            if (imageUrl.startsWith('data:image') || imageUrl.startsWith('http')) {
              // Use AI-generated image as background
              const bgUrl = `url("${imageUrl}")`;
              setBackgroundGradient(bgUrl);
            } else {
              // Fallback to gradient if image URL is invalid
              const gradient = getMoodGradient(response.session.backgroundImage);
              setBackgroundGradient(gradient);
            }
          } else {
            // Fallback to mood-based gradient
            const gradient = getMoodGradient(response.session.backgroundImage);
            setBackgroundGradient(gradient);
          }
        } else {
          setBackgroundGradient('linear-gradient(135deg, #c3e6cb 0%, #a5d8d8 50%, #b8e6e0 100%)');
        }
        
        // Check if we have background music
        if (response.session.backgroundMusic) {
          setBackgroundMusic(response.session.backgroundMusic);
          // Auto-play will be handled after user interaction
        }
      } else {
        // Fallback session data
        setSession({
          sessionId,
          backgroundImage: null,
          greeting: "Welcome to your personalized wellness session! I'm here to support you today.",
          status: 'active'
        });
        setBackgroundGradient('linear-gradient(135deg, #c3e6cb 0%, #a5d8d8 50%, #b8e6e0 100%)');
      }
    } catch (error) {
      // Fallback session data
      setSession({
        sessionId,
        backgroundImage: null,
        greeting: "Welcome to your personalized wellness session! I'm here to support you today.",
        status: 'active'
      });
      setBackgroundGradient('linear-gradient(135deg, #c3e6cb 0%, #a5d8d8 50%, #b8e6e0 100%)');
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to set up background music and auto-play (only when music first loads)
  useEffect(() => {
    if (backgroundMusic && backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = musicVolume;
      backgroundMusicRef.current.loop = true; // Loop the background music
      
      // Auto-play the music when it loads
      backgroundMusicRef.current.play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch(err => {
          // Music will remain paused, user can manually play it
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundMusic]); // Only trigger when backgroundMusic changes, not volume
  
  // Separate effect to update volume without restarting music
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Toggle background music playback
  const toggleBackgroundMusic = () => {
    if (!backgroundMusicRef.current || !backgroundMusic) return;
    
    if (isMusicPlaying) {
      backgroundMusicRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      backgroundMusicRef.current.play().catch(err => {
        // Error playing background music
      });
      setIsMusicPlaying(true);
    }
  };

  // Handle music volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = newVolume;
    }
  };

  const handleSessionStart = async () => {
    setIsLoading(true);
    try {
      // Don't create a regular chat - use 'session-chat' ID
      // The backend will create a session-linked chat automatically when first message is sent
      setChatId('session-chat');
      
      // Generate session start message with context
      const sessionStartMessage = {
        id: Date.now(),
        text: `Welcome to your wellness session! I'm here to support you today. ${moodNote ? `I see you mentioned: "${moodNote}". ` : ''}Is there anything from our previous sessions you'd like to continue working on, or would you like to share what's on your mind today?`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, sessionStartMessage]);
      setShowMoodCheckIn(false);
      
      // Update session with any notes provided
      if (moodNote) {
        await sessionService.updateSession(sessionId, 'moodCheckIn', {
          mood: 'shared',
          note: moodNote
        });
      }
    } catch (error) {
      // Error starting session
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
      // Use the existing chat ID for this session
      if (!chatId) {
        console.error('No chat ID available for session');
        return;
      }
      
      // Generate AI response using the existing chat functionality with session context
      const response = await authService.sendChatMessage(
        chatId,
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

  const handleSendAudioMessage = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          await sendAudioMessage(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        alert('Error accessing microphone. Please check permissions.');
      }
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    setIsLoading(true);
    try {
      if (!chatId) {
        return;
      }
      
      const response = await authService.sendAudioMessage(
        chatId,
        audioBlob,
        sessionId // Pass the sessionId for proper session chat detection
      );
      
      if (response.success) {
        const userMessage = {
          id: Date.now(),
          text: response.transcription || '[Audio Message]',
          sender: 'user',
          timestamp: new Date(),
          type: 'audio'
        };
        
        const aiMessage = {
          id: Date.now() + 1,
          text: response.message,
          sender: 'ai',
          timestamp: new Date(),
          audioUrl: response.audioUrl
        };
        
        setMessages(prev => [...prev, userMessage, aiMessage]);
        
        // Play the AI's audio response
        if (response.audioUrl) {
          playAudio(response.audioUrl);
        }
      }
    } catch (error) {
      // Error sending audio message
      alert('Failed to send audio message. Please try again.');
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

  const completeSession = async () => {
    try {
      setIsCompleting(true);
      const summary = `Session completed with ${moodNote ? 'user notes shared' : 'general discussion'} and ${messages.length} message exchanges.`;
      
      // Get auth data from context (most reliable)
      const authData = getAuthData();
      const firebaseUid = authData.firebaseUid || userContext?.firebaseUid || localStorage.getItem('firebaseUid');
      const secretCode = authData.secretCode || userContext?.secretCode || localStorage.getItem('userSecretCode');
      
      if (!firebaseUid && !secretCode) {
        alert('Authentication error: No user data found. Please login again.');
        setIsCompleting(false);
        return;
      }
      
      await sessionService.completeSession(sessionId, summary, firebaseUid, secretCode);
      onComplete(sessionId);
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session. Please try again.');
      setIsCompleting(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-1000 ease-in-out" 
      style={{ 
        background: backgroundGradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Completion Loading Overlay */}
      {isCompleting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Completing Session</h3>
            <p className="text-gray-600 mb-4">Generating your session summary and saving progress...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Session Start Modal */}
      {showMoodCheckIn && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#1E252B' }}>
                Welcome to Your Session
              </h3>
              <p className="text-gray-600">Let's begin your personalized wellness session</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Is there anything from our previous sessions you'd like to continue working on?
                </label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Share what's on your mind, any concerns, or things you'd like to work on today..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This helps me understand what you'd like to focus on today. You can also just start chatting about anything on your mind.
                </p>
              </div>
              
              <button
                onClick={handleSessionStart}
                disabled={isLoading}
                className="w-full px-6 py-4 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
              >
                {isLoading ? 'Starting Session...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Image Attribution */}
      {(session?.backgroundType === 'gemini-image' || session?.backgroundType === 'generated-image') && (
        <div 
          className="absolute bottom-4 left-4 z-40 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            color: 'white'
          }}
        >
          🎨 Background by {session?.backgroundType === 'gemini-image' ? 'Gemini Imagen 3' : 'AI'}
        </div>
      )}

      {/* Centered Chat Interface Container - 50% width with glass effect */}
      <div 
        className="w-1/2 h-[calc(100%-4rem)] my-8 flex flex-col rounded-[2.5rem] overflow-hidden border-2"
        style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(50px) saturate(200%)',
          boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          WebkitBackdropFilter: 'blur(50px) saturate(200%)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b"
          style={{ 
            background: 'rgba(147, 197, 253, 0.15)',
            backdropFilter: 'blur(40px) saturate(200%)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 16px 0 rgba(255, 255, 255, 0.1)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              
              <div>
                <h2 
                  className="text-xl font-bold" 
                  style={{ 
                    color: '#1e293b',
                    textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)'
                  }}
                >
                  Wellness Session
                </h2>
                <p 
                  className="text-sm" 
                  style={{ 
                    color: '#334155',
                    textShadow: '0 1px 1px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  Your personalized AI companion
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Background Music Controls */}
              {backgroundMusic && (
                <div className="flex items-center space-x-2 mr-2">
                  <button
                    onClick={toggleBackgroundMusic}
                    className="p-2 rounded-lg transition-all duration-300 border-2 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(40px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                      color: '#1e293b'
                    }}
                    title={isMusicPlaying ? 'Pause Music' : 'Play Music'}
                  >
                    {isMusicPlaying ? (
                      <SpeakerWaveIcon className="w-6 h-6" />
                    ) : (
                      <SpeakerXMarkIcon className="w-6 h-6" />
                    )}
                  </button>
                  {isMusicPlaying && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicVolume}
                      onChange={handleVolumeChange}
                      className="w-20"
                      style={{
                        accentColor: '#1e293b'
                      }}
                      title="Adjust volume"
                    />
                  )}
                </div>
              )}
              <button
                onClick={completeSession}
                disabled={isCompleting}
                className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm border-2 font-medium ${
                  isCompleting 
                    ? 'cursor-not-allowed' 
                    : 'hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                  color: isCompleting ? '#64748b' : '#1e293b',
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)'
                }}
              >
                {isCompleting ? 'Completing...' : 'Complete Session'}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all duration-300 border-2 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                  color: '#1e293b'
                }}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)'
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl border-2 ${
                message.sender === 'user'
                  ? 'text-white'
                  : 'text-gray-800'
              }`}
              style={message.sender === 'user' ? {
                background: 'rgba(147, 197, 253, 0.2)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(147, 197, 253, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
              } : {
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)'
              }}
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
            <div 
              className="px-4 py-3 rounded-2xl border-2"
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)'
              }}
            >
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

        {/* Input Area */}
        <div 
          className="border-t p-4"
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 -4px 16px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSendAudioMessage}
              className={`p-3 rounded-xl transition-all duration-300 border-2 ${
                isRecording 
                  ? 'text-white' 
                  : 'text-gray-700 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]'
              }`}
              style={isRecording ? {
                background: 'rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(239, 68, 68, 0.3), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
              } : {
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)'
              }}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-white/30 focus:outline-none placeholder-gray-500 text-gray-800"
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.15), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 hover:shadow-[0_8px_32px_0_rgba(147,197,253,0.3)]"
              style={{
                background: 'rgba(147, 197, 253, 0.3)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(147, 197, 253, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
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
      
      {/* Background music audio element */}
      {backgroundMusic && (
        <audio 
          ref={backgroundMusicRef} 
          src={backgroundMusic}
          className="hidden"
          onEnded={() => setIsMusicPlaying(false)}
          onPlay={() => setIsMusicPlaying(true)}
          onPause={() => setIsMusicPlaying(false)}
        />
      )}
    </div>
  );
};

export default SimpleSessionInterface;
