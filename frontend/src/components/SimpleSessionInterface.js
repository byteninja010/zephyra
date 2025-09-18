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
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const loadSession = useCallback(async () => {
    try {
      // For now, we'll simulate loading session data
      setSession({
        sessionId,
        backgroundImage: null,
        greeting: "Welcome to your personalized wellness session! I'm here to support you today.",
        status: 'active'
      });
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSessionStart = async () => {
    console.log('🚀 Starting session...');
    
    // DEBUG: Check authentication data immediately
    const authData = getAuthData();
    console.log('🔍 Session Start - authData:', authData);
    console.log('🔍 Session Start - userContext:', userContext);
    console.log('🔍 Session Start - localStorage firebaseUid:', localStorage.getItem('firebaseUid'));
    console.log('🔍 Session Start - localStorage secretCode:', localStorage.getItem('userSecretCode'));
    
    setIsLoading(true);
    try {
      console.log('📝 Creating chat...');
      // Create a new chat for this session
      const chatResponse = await authService.createNewChat();
      console.log('✅ Chat created:', chatResponse);
      const newChatId = chatResponse.chatId;
      setChatId(newChatId);
      
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
      console.log('✅ Session started successfully');
    } catch (error) {
      console.error('❌ Error starting session:', error);
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
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioMessage(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    setIsLoading(true);
    try {
      if (!chatId) {
        console.error('No chat ID available for session');
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await authService.sendAudioMessage(
        chatId,
        formData,
        sessionId // Pass the sessionId for proper session chat detection
      );
      
      if (response.success) {
        const userMessage = {
          id: Date.now(),
          text: response.transcription || '[Audio Message]',
          sender: 'user',
          timestamp: new Date(),
          audioUrl: response.audioUrl
        };
        
        const aiMessage = {
          id: Date.now() + 1,
          text: response.message,
          sender: 'ai',
          timestamp: new Date(),
          audioUrl: response.audioUrl
        };
        
        setMessages(prev => [...prev, userMessage, aiMessage]);
        
        if (response.audioUrl) {
          playAudio(response.audioUrl);
        }
      }
    } catch (error) {
      console.error('Error sending audio message:', error);
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
      
      console.log('🔍 SimpleSessionInterface completeSession - authData:', authData);
      console.log('🔍 SimpleSessionInterface completeSession - firebaseUid:', firebaseUid);
      console.log('🔍 SimpleSessionInterface completeSession - secretCode:', secretCode);
      console.log('🔍 SimpleSessionInterface completeSession - userContext:', userContext);
      console.log('🔍 SimpleSessionInterface completeSession - localStorage firebaseUid:', localStorage.getItem('firebaseUid'));
      console.log('🔍 SimpleSessionInterface completeSession - localStorage secretCode:', localStorage.getItem('userSecretCode'));
      
      if (!firebaseUid && !secretCode) {
        console.error('❌ No authentication data available!');
        console.error('❌ authData:', authData);
        console.error('❌ userContext:', userContext);
        console.error('❌ localStorage firebaseUid:', localStorage.getItem('firebaseUid'));
        console.error('❌ localStorage secretCode:', localStorage.getItem('userSecretCode'));
        alert('Authentication error: No user data found. Please login again.');
        setIsCompleting(false);
        return;
      }
      
      console.log('🔍 About to call sessionService.completeSession with:');
      console.log('🔍 sessionId:', sessionId);
      console.log('🔍 summary:', summary);
      console.log('🔍 firebaseUid:', firebaseUid);
      console.log('🔍 secretCode:', secretCode);
      
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
            <p className="text-lg">Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Wellness Session</h2>
              <p className="text-sm opacity-90">Your personalized AI companion</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={completeSession}
              disabled={isCompleting}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                isCompleting 
                  ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isCompleting ? 'Completing...' : 'Complete Session'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
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

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSendAudioMessage}
            className={`p-3 rounded-xl transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
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

export default SimpleSessionInterface;
