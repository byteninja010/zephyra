import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import socketService from '../services/socketService';
import authService from '../services/authService';
import CrisisSupportModal from './CrisisSupportModal';

const NewPost = () => {
  const navigate = useNavigate();
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [pseudonym, setPseudonym] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Load user's pseudonym
  const loadPseudonym = useCallback(async (uid) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forum/pseudonym/${uid}`);
      if (response.data.success) {
        setPseudonym(response.data.pseudonym);
      }
    } catch (error) {
      showNotification('Failed to load your identity', 'error');
    }
  }, [showNotification]);

  // Set up Socket.IO event listeners
  const setupSocketListeners = useCallback(() => {
    // Listen for own post acceptance
    socketService.onPostAccepted(async (data) => {
      showNotification('Your post has been published!', 'success');
      setSubmittingPost(false);
      setNewPostContent('');
      
      // Log forum post activity
      const logForumActivity = async () => {
        try {
          const uid = firebaseUid || localStorage.getItem('firebaseUid');
          if (!uid) return;

          await authService.logActivity(uid, 'forumPost');
        } catch (error) {
          // Silent fail - activity logging is non-critical
        }
      };

      // Call the logging function (non-blocking)
      logForumActivity();

      // Check if self-harm was detected
      if (data.selfHarm === true) {
        setShowCrisisModal(true);
      } else {
        // Redirect to forum after a short delay if no self-harm detected
        setTimeout(() => {
          navigate('/forum');
        }, 1500);
      }
    });

    // Listen for own post rejection
    socketService.onPostRejected((data) => {
      showNotification(`Post not published: ${data.reason}`, 'error');
      setSubmittingPost(false);
      setNewPostContent('');
    });

    // Listen for errors
    socketService.onPostError((data) => {
      showNotification('Failed to submit post: ' + data.error, 'error');
      setSubmittingPost(false);
      setNewPostContent('');
    });
  }, [showNotification, firebaseUid, navigate]);

  // Initialize and load data
  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const firebaseUidFromStorage = localStorage.getItem('firebaseUid');

    if (!userId || !firebaseUidFromStorage) {
      navigate('/auth');
      return;
    }

    setFirebaseUid(firebaseUidFromStorage);
    
    // Connect to Socket.IO
    socketService.connect();

    // Load initial data
    loadPseudonym(firebaseUidFromStorage);

    // Set up Socket.IO listeners
    setupSocketListeners();

    // Cleanup on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [navigate, loadPseudonym, setupSocketListeners]);

  // Submit new post
  const handleSubmitPost = () => {
    if (!newPostContent.trim()) {
      showNotification('Please write something before posting', 'warning');
      return;
    }

    if (newPostContent.length > 2000) {
      showNotification('Post is too long (max 2000 characters)', 'warning');
      return;
    }

    if (!socketService.isConnected()) {
      showNotification('Not connected to server. Please refresh the page.', 'error');
      return;
    }

    setSubmittingPost(true);
    showNotification('AI is checking your message...', 'info');
    socketService.submitPost(firebaseUid, newPostContent);
  };

  // Generate unique color for each pseudonym
  const getAvatarGradient = (pseudonym) => {
    if (!pseudonym) return 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)';
    
    let hash = 0;
    for (let i = 0; i < pseudonym.length; i++) {
      hash = pseudonym.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const gradients = [
      'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
      'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)',
      'linear-gradient(135deg, #4A9FB5 0%, #3C91C5 100%)',
      'linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)',
      'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)',
      'linear-gradient(135deg, #5A7D95 0%, #4A9FB5 100%)',
      'linear-gradient(135deg, #6BA3BC 0%, #3C91C5 100%)',
      'linear-gradient(135deg, #3C91C5 0%, #6BA3BC 100%)',
    ];
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Get notification styles
  const getNotificationStyles = (type) => {
    const base = 'px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3';
    switch (type) {
      case 'success':
        return `${base} bg-green-50 text-green-800 border-l-4 border-green-500`;
      case 'error':
        return `${base} bg-red-50 text-red-800 border-l-4 border-red-500`;
      case 'warning':
        return `${base} bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500`;
      default:
        return `${base} bg-blue-50 text-blue-800 border-l-4 border-blue-500`;
    }
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
      
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
        {/* Floating Background Bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-16 left-[10%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              animation: "float 8s ease-in-out infinite"
            }}
          ></div>
          <div
            className="absolute top-20 left-[30%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)",
              animation: "float 7s ease-in-out infinite",
              animationDelay: "1s"
            }}
          ></div>
          <div
            className="absolute top-24 left-[50%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)",
              animation: "float 9s ease-in-out infinite",
              animationDelay: "2s"
            }}
          ></div>
          <div
            className="absolute top-20 left-[70%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)",
              animation: "float 8s ease-in-out infinite",
              animationDelay: "3s"
            }}
          ></div>
        </div>

        {/* Header */}
        <div className="dashboard-card bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50" style={{ borderColor: '#e5e7eb' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                <button
                  onClick={() => navigate('/forum')}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-blue-50 transition-colors"
                  style={{ color: '#3C91C5' }}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: '#1e293b' }}>Create New Post</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 animate-slide-up">
            <div className={getNotificationStyles(notification.type)}>
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Main Container */}
        <div className="relative z-10 max-w-6xl mx-auto flex gap-4 sm:gap-6 pt-4 sm:pt-6 px-2 sm:px-4 pb-20">
          <div className="flex-1 max-w-2xl mx-auto">
            {/* Compose Post Card */}
            <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-white/40" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="flex space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm sm:text-base" style={{ background: getAvatarGradient(pseudonym) }}>
                    {pseudonym?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What's on your mind? Post pseudonymously and get support from real like-minded individuals."
                      className="w-full text-sm sm:text-base md:text-lg border-0 focus:outline-none resize-none placeholder-gray-400"
                      style={{ color: '#1e293b', minHeight: '120px' }}
                      maxLength={2000}
                      disabled={submittingPost}
                    />
                    <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm" style={{ color: '#64748b' }}>
                          {newPostContent.length}/2000
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F4FD', color: '#3C91C5' }}>
                          🛡️ AI Moderated
                        </span>
                      </div>
                      <button
                        onClick={handleSubmitPost}
                        disabled={submittingPost || !newPostContent.trim()}
                        className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-semibold text-white text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        style={{ 
                          background: submittingPost || !newPostContent.trim() ? '#94a3b8' : 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                          boxShadow: submittingPost || !newPostContent.trim() ? 'none' : '0 2px 8px rgba(60, 145, 197, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          if (!submittingPost && newPostContent.trim()) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {submittingPost && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        )}
                        <span>{submittingPost ? 'Posting...' : 'Post'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm mt-4 border border-white/40" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#3C91C5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold mb-2" style={{ color: '#1e293b' }}>About Posting</h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm" style={{ color: '#64748b' }}>
                      <li>• All posts are AI-moderated for safety</li>
                      <li>• You post using your pseudonym, not your real name</li>
                      <li>• Be respectful and supportive to others</li>
                      <li>• Maximum 2000 characters per post</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crisis Support Modal */}
      <CrisisSupportModal 
        isOpen={showCrisisModal}
        onClose={() => {
          setShowCrisisModal(false);
          navigate('/forum');
        }}
      />
    </>
  );
};

export default NewPost;

