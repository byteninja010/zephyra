import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import API_URL from "../config/api";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  NoSymbolIcon,
  XMarkIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  CheckIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

const ChatInterface = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('text'); // 'text' or 'audio'
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isChatHistoryCollapsed, setIsChatHistoryCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isContinuousRecording, setIsContinuousRecording] = useState(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(280); // Reduced default width
  const [isResizing, setIsResizing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const recordingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);


  // Cleanup continuous recording when component unmounts or chat changes
  useEffect(() => {
    return () => {
      if (isContinuousRecording) {
        stopContinuousRecording();
      }
    };
  }, [currentChatId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isContinuousRecording) {
        stopContinuousRecording();
      }
    };
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await authService.getChatHistory();
      if (response.success) {
        setChatHistory(response.chats);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const startNewChat = async () => {
    try {
      // Stop continuous recording if active
      if (isContinuousRecording) {
        stopContinuousRecording();
      }

      const response = await authService.createNewChat();
      if (response.success) {
        setCurrentChatId(response.chatId);
        setMessages([]);
        setShowChatHistory(false);
        setShowMobileMenu(false);


        // Refresh chat history to show the new chat
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };


  const loadChat = async (chatId) => {
    try {
      // Stop continuous recording if active
      if (isContinuousRecording) {
        stopContinuousRecording();
      }

      const response = await authService.getChat(chatId);
      if (response.success) {
        setCurrentChatId(chatId);
        setMessages(response.chat.messages || []);
        setShowChatHistory(false);
        setShowMobileMenu(false);

      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      const response = await authService.deleteChat(chatToDelete);
      if (response.success) {
        // If we're deleting the current chat, clear it
        if (currentChatId === chatToDelete) {
          setCurrentChatId(null);
          setMessages([]);
        }

        // Reload chat history
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setShowDeleteConfirm(false);
      setChatToDelete(null);
    }
  };

  const cancelDeleteChat = () => {
    setShowDeleteConfirm(false);
    setChatToDelete(null);
  };

  const startEditingChat = (chatId, currentTitle, e) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const saveChatTitle = async (chatId) => {
    if (editingTitle.trim() === "") {
      cancelEditing();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/chat/${chatId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });

      if (response.ok) {
        // Update local state
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat._id === chatId ? { ...chat, title: editingTitle.trim() } : chat
          )
        );
        cancelEditing();
      } else {
        console.error("Failed to update chat title");
      }
    } catch (error) {
      console.error("Error updating chat title:", error);
    }
  };

  const handleKeyPress = (e, chatId) => {
    if (e.key === "Enter") {
      saveChatTitle(chatId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 500;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentChatId || isLoading) return;

    const messageText = inputMessage.trim();
    const messageType = "text";

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setLoadingType('text');

    try {
      const response = await authService.sendChatMessage(
        currentChatId,
        messageText,
        messageType,
        false
      );

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.message,
          sender: "ai",
          timestamp: new Date(),
          type: response.messageType || "text",
          audioUrl: response.audioUrl,
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Log chat session activity (once per session per day for balanced tracking)
        const logChatActivity = async () => {
          try {
            const firebaseUid = localStorage.getItem('firebaseUid');
            if (!firebaseUid) return;

            const today = new Date().toDateString();
            const lastLogKey = `lastChatLog_${currentChatId}`;
            const lastChatLogDate = localStorage.getItem(lastLogKey);
            
            // Only log if we haven't logged this chat session today
            if (lastChatLogDate !== today) {
              const result = await authService.logActivity(firebaseUid, 'chatSession');
              
              if (result.success) {
                localStorage.setItem(lastLogKey, today);
              }
            }
          } catch (error) {
            // Silent fail - activity logging is non-critical
          }
        };

        // Call the logging function (non-blocking)
        logChatActivity();

        // Play audio response if available, or use Web Speech API
        if (response.audioUrl) {
          playAudio(response.audioUrl);
        } else {
          // Use Web Speech API for high-quality TTS
          setTimeout(() => {
            speakTextWithWebSpeech();
          }, 1000); // Delay to ensure message is rendered and state is updated
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContinuousRecording = () => {
    if (isContinuousRecording) {
      stopContinuousRecording();
    } else {
      startContinuousRecording();
    }
  };

  const startContinuousRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio recording is not supported in this browser");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/webm;codecs=opus",
            });
            sendAudioMessage(audioBlob);
            audioChunksRef.current = []; // Reset for next recording
          }

          // If still in continuous recording mode, restart recording
          if (isContinuousRecording) {
            setTimeout(() => {
              if (mediaRecorderRef.current && isContinuousRecording) {
                mediaRecorderRef.current.start();
              }
            }, 100);
          } else {
            // Stop all tracks to release microphone
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setIsContinuousRecording(true);
        setShowRecordingPopup(true);
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        alert("Error accessing microphone. Please check permissions.");
      });
  };

  const stopContinuousRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsContinuousRecording(false);
      setShowRecordingPopup(false);
    }
  };

  const startRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio recording is not supported in this browser");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm;codecs=opus",
          });
          sendAudioMessage(audioBlob);

          // Stop all tracks to release microphone
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        alert("Error accessing microphone. Please check permissions.");
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    try {
      setIsLoading(true);
      setLoadingType('audio');
      // Use traditional audio processing
      const response = await authService.sendAudioMessage(
        currentChatId,
        audioBlob
      );

      if (response.success) {
        // The user message is already added in the backend with transcription
        // We just need to add the AI response
        const aiMessage = {
          id: Date.now() + 1,
          text: response.message,
          sender: "ai",
          timestamp: new Date(),
          type: response.messageType || "text",
          audioUrl: response.audioUrl,
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Log chat session activity (once per session per day for balanced tracking)
        const logChatActivity = async () => {
          try {
            const firebaseUid = localStorage.getItem('firebaseUid');
            if (!firebaseUid) return;

            const today = new Date().toDateString();
            const lastLogKey = `lastChatLog_${currentChatId}`;
            const lastChatLogDate = localStorage.getItem(lastLogKey);
            
            // Only log if we haven't logged this chat session today
            if (lastChatLogDate !== today) {
              const result = await authService.logActivity(firebaseUid, 'chatSession');
              
              if (result.success) {
                localStorage.setItem(lastLogKey, today);
              }
            }
          } catch (error) {
            // Silent fail - activity logging is non-critical
          }
        };

        // Call the logging function (non-blocking)
        logChatActivity();

        // Play audio response or use Web Speech API
        if (response.audioUrl) {
          playAudio(response.audioUrl);
        } else {
          // Use Web Speech API for high-quality TTS
          setTimeout(() => {
            speakTextWithWebSpeech();
          }, 1000); // Delay to ensure message is rendered and state is updated
        }
      }
    } catch (error) {
      console.error("Error sending audio message:", error);


      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble processing your audio message. Please try again.",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioUrl) => {
    if (audioUrl) {
      // If we have an audio URL, play it
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsAudioPlaying(true);
            setCurrentPlayingAudio(audioUrl);
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
            setIsAudioPlaying(false);
            setCurrentPlayingAudio(null);
          });
      }
    } else {
      // Use Web Speech API for high-quality TTS
      speakTextWithWebSpeech();
    }
  };

  const speakTextWithWebSpeech = () => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      // Get the last AI message
      const lastAIMessage = messages.filter(msg => msg.sender === 'ai').pop();
      if (lastAIMessage) {
        speakSpecificText(lastAIMessage.text);
      }
    }
  };

  const speakSpecificText = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings for high quality
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Try to use a high-quality voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Natural') ||
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsAudioPlaying(true);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsAudioPlaying(false);
        setCurrentPlayingAudio(null);
      };
      
      utterance.onerror = (error) => {
        setIsPlaying(false);
        setIsAudioPlaying(false);
        setCurrentPlayingAudio(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleAudioPlayback = (audioUrl) => {
    // If the same audio is currently playing, pause it
    if (currentPlayingAudio === audioUrl && isAudioPlaying) {
      if (audioUrl) {
        // Pause audio file
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        // Stop speech synthesis
        window.speechSynthesis.cancel();
      }
      setIsAudioPlaying(false);
      setIsPlaying(false);
      setCurrentPlayingAudio(null);
    } 
    // If different audio or no audio playing, play the new audio
    else {
      playAudio(audioUrl);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageBubbleClass = (sender) => {
    if (sender === "user") {
      return "bg-gradient-to-r from-blue-500 to-purple-600 text-white";
    } else {
      return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800";
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)",
      }}
    >
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10"
          style={{
            background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
          }}
        ></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15"
          style={{
            background: "linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)",
          }}
        ></div>
        <div
          className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full opacity-20"
          style={{
            background: "linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)",
          }}
        ></div>
        <div
          className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full opacity-10"
          style={{
            background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
          }}
        ></div>
      </div>
      {/* Header */}
      <div className="dashboard-card sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Back Arrow */}
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-white/50 transition-all duration-300 transform hover:scale-105 group"
                style={{ color: "#475569" }}
                title="Back to Dashboard"
              >
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(!showMobileMenu);
                  if (!showMobileMenu) {
                    setIsChatHistoryCollapsed(false);
                  }
                }}
                className="lg:hidden p-2 rounded-lg hover:bg-white/50 transition-colors"
                style={{ color: "#475569" }}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <div className="flex items-center justify-start">
                <img
                  src="/logo.png"
                  alt="Zephyra Logo"
                  className="w-12 h-10 sm:w-16 sm:h-14 object-contain"
                />
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: "#1E252B" }}>
                  Zephyra
                </h1>
              </div>
            </div>

            <div className="flex items-center">
              {!currentChatId && (
                <button
                  onClick={startNewChat}
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background:
                      "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                  }}
                >
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Chat</span>
                  <span className="sm:hidden">New</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar - Chat History */}
        <div
          className={`dashboard-card ${showMobileMenu ? "block" : "hidden"} ${
            isChatHistoryCollapsed ? "lg:hidden" : "lg:block"
          } bg-white/60 backdrop-blur-sm border-r border-white/20 flex-shrink-0 transition-all duration-300 relative`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2
                className="text-base sm:text-lg font-semibold"
                style={{ color: "#1E252B" }}
              >
                Chat History
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsChatHistoryCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                  style={{ color: "#475569" }}
                  title="Hide Chat History"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setIsChatHistoryCollapsed(false);
                  }}
                  className="lg:hidden p-1 rounded-lg hover:bg-white/50 transition-colors"
                  style={{ color: "#475569" }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      background:
                        "linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)",
                    }}
                  >
                    <ChatBubbleLeftRightIcon
                      className="w-8 h-8"
                      style={{ color: "#7B1FA2" }}
                    />
                  </div>
                  <p style={{ color: "#475569" }}>No chats yet</p>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    Start a new conversation
                  </p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat._id}
                    className={`dashboard-card p-3 rounded-xl cursor-pointer transition-all duration-300 group hover:shadow-lg ${
                      currentChatId === chat._id
                        ? "text-white shadow-xl"
                        : "bg-white/80 hover:bg-white hover:-translate-y-1"
                    }`}
                    style={
                      currentChatId === chat._id
                        ? {
                            background:
                              "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                          }
                        : {}
                    }
                    onClick={() => loadChat(chat._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingChatId === chat._id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, chat._id)}
                            onBlur={() => saveChatTitle(chat._id)}
                            className={`w-full bg-transparent border-none outline-none font-medium ${
                              currentChatId === chat._id
                                ? "text-white"
                                : "text-gray-800"
                            }`}
                            autoFocus
                            maxLength={50}
                          />
                        ) : (
                          <h3
                            className={`font-medium truncate ${
                              currentChatId === chat._id
                                ? "text-white"
                                : "text-gray-800"
                            }`}
                            onClick={(e) =>
                              startEditingChat(
                                chat._id,
                                chat.title || `Chat ${chat._id.slice(-6)}`,
                                e
                              )
                            }
                            title="Click to rename"
                          >
                            {chat.title || `Chat ${chat._id.slice(-6)}`}
                          </h3>
                        )}
                        <p
                          className={`text-sm truncate ${
                            currentChatId === chat._id
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {editingChatId === chat._id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveChatTitle(chat._id);
                            }}
                            className={`p-1 rounded-lg transition-all duration-200 ${
                              currentChatId === chat._id
                                ? "text-white hover:bg-white/20"
                                : "text-gray-400 hover:bg-gray-100 hover:text-green-500"
                            }`}
                            title="Save"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) =>
                              startEditingChat(
                                chat._id,
                                chat.title || `Chat ${chat._id.slice(-6)}`,
                                e
                              )
                            }
                            className={`p-1 rounded-lg transition-all duration-200 ${
                              currentChatId === chat._id
                                ? "text-white hover:bg-white/20"
                                : "text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                            }`}
                            title="Rename chat"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteChat(chat._id, e)}
                          className={`p-1 rounded-lg transition-all duration-200 ${
                            currentChatId === chat._id
                              ? "text-white hover:bg-white/20"
                              : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          }`}
                          title="Delete chat"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-2 h-full bg-transparent hover:bg-blue-300/30 cursor-col-resize transition-colors duration-200 group flex items-center justify-center"
            onMouseDown={handleMouseDown}
            title="Drag to resize sidebar"
          >
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-500 transition-colors duration-200 rounded-full"></div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!currentChatId ? (
            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
              <div className="text-center max-w-md">
                <div className="dashboard-card w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6 glass backdrop-blur-lg border border-white/20 shadow-2xl">
                  <img
                    src="/logo.png"
                    alt="Zephyra Logo"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                    <h2
                      className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2"
                      style={{ color: "#1E252B" }}
                    >
                      Welcome to Zephyra
                    </h2>
                    <p className="mb-6 sm:mb-8 text-sm sm:text-base md:text-lg px-2" style={{ color: "#2C363E" }}>
                  Your supportive AI friend for mental wellness. Start a
                  conversation and let's work together on your journey to better
                  mental health.
                </p>
                <div className="flex items-center justify-center space-x-4">
                  {isChatHistoryCollapsed && (
                    <button
                      onClick={() => setIsChatHistoryCollapsed(false)}
                      className="p-3 rounded-xl hover:bg-white/50 transition-colors"
                      style={{ color: "#475569" }}
                      title="Show Chat History"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </button>
                  )}
                    <button
                      onClick={startNewChat}
                      className="px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg text-white rounded-xl sm:rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                      }}
                    >
                      <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 inline mr-1 sm:mr-2" />
                      Start New Chat
                    </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-white/60 backdrop-blur-sm border-b border-white/20 p-3 sm:p-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                    {isChatHistoryCollapsed && (
                      <button
                        onClick={() => setIsChatHistoryCollapsed(false)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0"
                        style={{ color: "#475569" }}
                        title="Show Chat History"
                      >
                        <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    <h2
                      className="text-sm sm:text-base md:text-lg font-semibold truncate"
                      style={{ color: "#1E252B" }}
                    >
                      {chatHistory.find((chat) => chat._id === currentChatId)
                        ?.title || "Zephyra Chat"}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={startNewChat}
                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-lg group relative"
                      style={{ color: "#3C91C5" }}
                    >
                      <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                        New Chat
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
                    <div className="dashboard-card w-28 h-28 rounded-3xl flex items-center justify-center mb-6 glass backdrop-blur-lg border border-white/20 shadow-2xl">
                      <img
                        src="/logo.png"
                        alt="Zephyra Logo"
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                    <h3
                      className="text-xl font-semibold mb-3"
                      style={{ color: "#1E252B" }}
                    >
                      Start Your Conversation
                    </h3>
                    <p className="mb-6 max-w-md" style={{ color: "#475569" }}>
                      Type a message or use voice to start our conversation. I'm here to support your mental wellness journey.
                    </p>
                    <button
                      onClick={() => {
                        setIsChatHistoryCollapsed(true);
                        toggleContinuousRecording();
                      }}
                      className="px-6 py-3 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      style={{
                        background:
                          "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                      }}
                    >
                      <MicrophoneIcon className="w-5 h-5 inline mr-2" />
                      Start Voice Chat
                    </button>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                      <div
                        className={`dashboard-card max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg ${
                          message.sender === "user"
                            ? "text-white"
                            : "bg-white/80 backdrop-blur-sm"
                        }`}
                        style={
                          message.sender === "user"
                            ? {
                                background:
                                  "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                              }
                            : {}
                        }
                      >
                        <p
                          className={`text-sm leading-relaxed ${
                            message.sender === "user" ? "text-white" : ""
                          }`}
                          style={
                            message.sender === "ai" ? { color: "#1E252B" } : {}
                          }
                        >
                          {message.text}
                        </p>

                         {/* Audio controls for AI messages */}
                         {message.sender === "ai" && (
                           <div className="mt-3 flex items-center space-x-2">
                             <button
                               onClick={() => {
                                 if (message.audioUrl) {
                                   toggleAudioPlayback(message.audioUrl);
                                 } else {
                                   // Use Web Speech API for this specific message
                                   speakSpecificText(message.text);
                                 }
                               }}
                               className="p-2 rounded-lg transition-colors bg-gray-100 hover:bg-gray-200"
                               title="Play audio"
                             >
                               {isAudioPlaying && currentPlayingAudio === message.audioUrl ? (
                                 <SpeakerXMarkIcon className="w-4 h-4" />
                               ) : (
                                 <SpeakerWaveIcon className="w-4 h-4" />
                               )}
                             </button>
                             <span
                               className="text-xs"
                               style={{ color: "#64748B" }}
                             >
                               {message.audioUrl ? "Audio Message" : "Text to Speech"}
                             </span>
                           </div>
                         )}

                        <p
                          className={`text-xs mt-2 ${
                            message.sender === "user" ? "text-blue-100" : ""
                          }`}
                          style={
                            message.sender === "ai" ? { color: "#64748B" } : {}
                          }
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                    ))}
                    
                    {/* Loading State */}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="dashboard-card max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg bg-white/80 backdrop-blur-sm">
                          <div className="flex items-center space-x-3">
                            {loadingType === 'audio' ? (
                              <div className="flex items-center space-x-2">
                                <MicrophoneIcon className="w-4 h-4 text-blue-500 animate-pulse" />
                                <div className="flex space-x-1">
                                  <div key="audio-pulse-1" className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                  <div 
                                    key="audio-pulse-2"
                                    className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.1s" }}
                                  ></div>
                                  <div 
                                    key="audio-pulse-3"
                                    className="w-1 h-5 bg-blue-500 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.2s" }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex space-x-1">
                                <div key="text-bounce-1" className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div 
                                  key="text-bounce-2"
                                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div 
                                  key="text-bounce-3"
                                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                            )}
                            <span 
                              className="text-sm"
                              style={{ color: "#475569" }}
                            >
                              {loadingType === 'audio' 
                                ? 'Processing your voice...' 
                                : 'Zephyra is thinking...'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="dashboard-card bg-white/60 backdrop-blur-sm border-t border-white/20 p-4 relative z-10">

                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message or use voice..."
                      className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300"
                      style={{
                        border: "1px solid rgba(60, 145, 197, 0.2)",
                        color: "#1E252B",
                      }}
                      disabled={isLoading}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                    />
                  </div>

                  <button
                    onClick={() => {
                      setIsChatHistoryCollapsed(true);
                      toggleContinuousRecording();
                    }}
                    className={`p-3 rounded-xl transition-all duration-300 hover:shadow-lg ${
                      isContinuousRecording
                        ? "text-white animate-pulse"
                        : "text-gray-600 hover:bg-white/50"
                    }`}
                    style={
                      isContinuousRecording
                        ? {
                            background:
                              "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                          }
                        : {}
                    }
                    title={
                      isContinuousRecording
                        ? "Stop Continuous Recording"
                        : "Start Continuous Recording"
                    }
                  >
                    {isContinuousRecording ? (
                      <NoSymbolIcon className="w-6 h-6" />
                    ) : (
                      <MicrophoneIcon className="w-6 h-6" />
                    )}
                  </button>

                  <button
                    onClick={handleSendMessage}
                    disabled={
                      isLoading ||
                      (!inputMessage.trim() && !isContinuousRecording)
                    }
                    className={`p-3 rounded-xl transition-all duration-300 hover:shadow-xl ${
                      isLoading ||
                      (!inputMessage.trim() && !isContinuousRecording)
                        ? "cursor-not-allowed"
                        : "text-white hover:-translate-y-1"
                    }`}
                    style={
                      isLoading ||
                      (!inputMessage.trim() && !isContinuousRecording)
                        ? { background: "#E2E8F0", color: "#94A3B8" }
                        : {
                            background:
                              "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
                          }
                    }
                    title={isLoading ? "Sending..." : "Send message"}
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <PaperAirplaneIcon className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recording Popup */}
      {showRecordingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
          {/* Backdrop with blur effect */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          
          <div className="dashboard-card relative bg-white/95 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300 hover:shadow-3xl transition-all">
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                }}
              >
                <MicrophoneIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ color: "#1E252B" }}
                >
                  🎤 Recording...
                </h3>
                <p className="text-sm" style={{ color: "#475569" }}>
                  Click stop when you're finished speaking
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex space-x-1">
                <div key="rec-bounce-1" className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                <div
                  key="rec-bounce-2"
                  className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  key="rec-bounce-3"
                  className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center space-x-3">
              <button
                onClick={stopContinuousRecording}
                className="px-6 py-2 text-white rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                }}
              >
                <div className="flex items-center space-x-2">
                  <NoSymbolIcon className="w-4 h-4" />
                  <span className="font-medium">Stop Recording</span>
                </div>
              </button>
              <button
                onClick={() => setShowRecordingPopup(false)}
                className="px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-300"
                style={{ color: "#475569" }}
              >
                <span className="text-sm">Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Audio Player */}
       <audio
         ref={audioRef}
         onEnded={() => {
           setIsPlaying(false);
           setIsAudioPlaying(false);
           setCurrentPlayingAudio(null);
         }}
         onPause={() => {
           setIsPlaying(false);
           setIsAudioPlaying(false);
         }}
         onError={(e) => {
           console.error("Audio playback error:", e);
           setIsPlaying(false);
           setIsAudioPlaying(false);
           setCurrentPlayingAudio(null);
         }}
         className="hidden"
       />

       {/* Custom Delete Confirmation Dialog */}
       {showDeleteConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center">
           {/* Backdrop with blur effect */}
           <div 
             className="absolute inset-0 bg-black/50 backdrop-blur-sm"
             onClick={cancelDeleteChat}
           ></div>
           
           {/* Dialog */}
           <div className="dashboard-card relative bg-white/95 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 mx-4 max-w-md animate-in slide-in-from-bottom-4 duration-300">
             <div className="text-center">
               {/* Warning Icon */}
               <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}>
                 <svg className="w-8 h-8" style={{ color: '#F59E0B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                 </svg>
               </div>
               
               {/* Title */}
               <h3 className="text-xl font-bold mb-3" style={{ color: '#1E252B' }}>
                 Delete Chat
               </h3>
               
               {/* Message */}
               <p className="text-sm mb-8" style={{ color: '#475569' }}>
                 Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently removed.
               </p>
               
               {/* Buttons */}
               <div className="flex space-x-3">
                 <button
                   onClick={cancelDeleteChat}
                   className="flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:bg-gray-100 transform hover:scale-105"
                   style={{ color: '#475569' }}
                 >
                   Cancel
                 </button>
                 <button
                   onClick={confirmDeleteChat}
                   className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95"
                   style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
                 >
                   Delete Chat
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default ChatInterface;
