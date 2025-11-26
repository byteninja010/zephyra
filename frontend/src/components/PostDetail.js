import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import socketService from '../services/socketService';
import authService from '../services/authService';

const PostDetail = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [pseudonym, setPseudonym] = useState('');
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // Track which comment is being replied to (commentId)
  const [notification, setNotification] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Track window size for responsive comment nesting
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Load post with comments
  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/forum/posts/${postId}`);
      
      if (response.data.success) {
        setPost(response.data.post);
      } else {
        showNotification('Post not found', 'error');
        navigate('/forum');
      }
    } catch (error) {
      showNotification('Failed to load post', 'error');
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  }, [postId, navigate, showNotification]);

  // Set up Socket.IO event listeners
  const setupSocketListeners = useCallback(() => {
    // Listen for new comments from other users
    socketService.onNewComment((data) => {
      if (data.postId === postId) {
        setPost(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), data],
            commentCount: (prev.commentCount || 0) + 1
          };
        });
      }
    });

    // Listen for own comment acceptance
    socketService.onCommentAccepted((data) => {
      if (data.comment.postId === postId) {
        showNotification('Your comment has been published!', 'success');
        setCommentInput('');
        setSubmittingComment(false);
        setReplyingTo(null);
        // Reload post to get the new comment
        loadPost();
      }
    });

    // Listen for own comment rejection
    socketService.onCommentRejected((data) => {
      if (data.postId === postId) {
        showNotification(`Comment not published: ${data.reason}`, 'error');
        setSubmittingComment(false);
        setCommentInput('');
        setReplyingTo(null);
      }
    });

    // Listen for errors
    socketService.onCommentError((data) => {
      if (data.postId === postId) {
        showNotification('Failed to submit comment: ' + data.error, 'error');
        setSubmittingComment(false);
        setCommentInput('');
      }
    });
  }, [postId, showNotification, loadPost]);

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
    loadPost();

    // Set up Socket.IO listeners
    setupSocketListeners();

    // Cleanup on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [navigate, loadPseudonym, loadPost, setupSocketListeners]);

  // Submit comment (or reply)
  const handleSubmitComment = () => {
    const content = commentInput || '';
    const parentCommentId = replyingTo || null;
    
    if (!content.trim()) {
      showNotification('Please write something before commenting', 'warning');
      return;
    }

    if (content.length > 1000) {
      showNotification('Comment is too long (max 1000 characters)', 'warning');
      return;
    }

    if (!socketService.isConnected()) {
      showNotification('Not connected to server. Please refresh the page.', 'error');
      return;
    }

    setSubmittingComment(true);
    showNotification('AI is checking your comment...', 'info');
    socketService.submitComment(firebaseUid, postId, content, parentCommentId);
  };

  // Start replying to a comment
  const handleReplyToComment = (commentId, commentPseudonym) => {
    setReplyingTo(commentId);
    setCommentInput(`@${commentPseudonym} `);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentInput('');
  };

  // Organize comments into a hierarchical structure with unlimited depth
  const organizeCommentsHierarchy = (comments) => {
    if (!comments || comments.length === 0) return [];

    const topLevelComments = comments.filter(c => !c.parentCommentId);
    const repliesMap = {};

    // Group replies by parent
    comments.forEach(comment => {
      if (comment.parentCommentId) {
        if (!repliesMap[comment.parentCommentId]) {
          repliesMap[comment.parentCommentId] = [];
        }
        repliesMap[comment.parentCommentId].push(comment);
      }
    });

    // Recursively attach replies to their parents
    const attachReplies = (comment) => {
      const directReplies = repliesMap[comment.commentId] || [];
      return {
        ...comment,
        replies: directReplies.map(reply => attachReplies(reply))
      };
    };

    return topLevelComments.map(attachReplies);
  };

  // Render a comment with its nested replies recursively
  const renderCommentThread = (comment, depth = 0) => {
    const isAuthor = comment.firebaseUid === firebaseUid;
    const hasReplies = comment.replies && comment.replies.length > 0;

    // Responsive padding: smaller on mobile, larger on desktop
    const effectiveDepth = Math.min(depth, 5);
    const mobilePadding = effectiveDepth * 12;
    const desktopPadding = effectiveDepth * 48;

    return (
      <div key={comment.commentId}>
        {/* Comment Container */}
        <div className={`flex space-x-2 sm:space-x-3 py-2 sm:py-3 ${depth === 0 ? 'border-b' : ''}`} style={{ 
          borderColor: '#f1f5f9',
          paddingLeft: isMobile ? `${mobilePadding}px` : `${desktopPadding}px`
        }}>
          {/* Threading Line for nested comments */}
          {depth > 0 && !isMobile && (
            <div 
              className="absolute w-0.5" 
              style={{ 
                backgroundColor: '#cbd5e1',
                left: `${(depth - 1) * 48 + 81}px`,
                top: 0,
                bottom: 0,
                height: '100%'
              }}
            ></div>
          )}
          
          {/* Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs relative" style={{ 
            background: getAvatarGradient(comment.pseudonym),
            zIndex: 1
          }}>
            {comment.pseudonym?.[0] || '?'}
          </div>
          
          {/* Comment Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center space-x-1 sm:space-x-2 flex-1 min-w-0">
                <p className="font-bold text-xs sm:text-sm truncate" style={{ color: '#0f172a' }}>{comment.pseudonym}</p>
                <span className="text-xs" style={{ color: '#cbd5e1' }}>·</span>
                <p className="text-xs flex-shrink-0" style={{ color: '#64748b' }}>{formatTime(comment.createdAt)}</p>
              </div>
              
              {/* Delete button */}
              {isAuthor && (
                <button
                  onClick={() => handleDeleteComment(comment.commentId)}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-red-50 transition-colors group"
                  title="Delete comment"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words mb-2" style={{ color: '#0f172a', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{comment.content}</p>
            
            {/* Reply button */}
            <button
              onClick={() => handleReplyToComment(comment.commentId, comment.pseudonym)}
              className="flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E8F4FD';
                e.currentTarget.style.color = '#3C91C5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="hidden sm:inline">Reply</span>
              {hasReplies && (
                <span className="px-1 sm:px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#E8F4FD', color: '#3C91C5' }}>
                  {comment.replies.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Nested Replies - Recursive rendering */}
        {hasReplies && (
          <div className="relative">
            {comment.replies.map((reply) => renderCommentThread(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/forum/posts/${postId}/comments/${commentId}`,
        {
          data: { firebaseUid }
        }
      );

      if (response.data.success) {
        const deletedCount = response.data.deletedCount || 1;
        const deletedIds = response.data.deletedIds || [commentId];
        
        // Remove all deleted comments from local state
        setPost(prev => {
          if (!prev) return prev;
          const updatedComments = prev.comments.filter(c => !deletedIds.includes(c.commentId));
          
          return {
            ...prev,
            comments: updatedComments,
            commentCount: Math.max(0, prev.commentCount - deletedCount)
          };
        });
        
        const message = deletedCount > 1 
          ? `Comment and ${deletedCount - 1} ${deletedCount === 2 ? 'reply' : 'replies'} deleted successfully`
          : 'Comment deleted successfully';
        showNotification(message, 'success');
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete comment', 'error');
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/forum/posts/${postId}`, {
        data: { firebaseUid }
      });

      if (response.data.success) {
        showNotification('Post deleted successfully', 'success');
        navigate('/forum');
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete post', 'error');
    }
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

  // Format relative time
  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
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

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #E8F4FD 0%, #D1E7DD 50%, #A8DADC 100%)' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 mx-auto" style={{ borderColor: '#e5e7eb', borderTopColor: '#3C91C5' }}></div>
            <p className="mt-4" style={{ color: '#64748b' }}>Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

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
                <h1 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: '#1e293b' }}>Post</h1>
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
            {/* Post Card */}
            <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm mb-4 border border-white/40" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-3 sm:p-4 md:p-5">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm" style={{ background: getAvatarGradient(post.pseudonym) }}>
                      {post.pseudonym?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <p className="font-bold text-sm sm:text-base" style={{ color: '#0f172a' }}>{post.pseudonym}</p>
                        <span className="hidden sm:inline" style={{ color: '#cbd5e1' }}>·</span>
                        <p className="text-xs sm:text-sm" style={{ color: '#64748b' }}>{formatTime(post.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  {post.firebaseUid === firebaseUid && (
                    <button
                      onClick={handleDeletePost}
                      className="flex-shrink-0 p-2 rounded-full hover:bg-red-50 transition-colors group"
                      title="Delete post"
                    >
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="mb-3 sm:mb-4 ml-0 sm:ml-15">
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#0f172a' }}>{post.content}</p>
                </div>

                {/* Post Actions */}
                <div className="flex items-center space-x-1 ml-0 sm:ml-15 pt-2 sm:pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full" style={{ color: '#3C91C5' }}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium">{post.commentCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm mb-4 border border-white/40" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-3 sm:p-4">
                <div className="flex space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs" style={{ background: getAvatarGradient(pseudonym) }}>
                    {pseudonym?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    {replyingTo && (
                      <div className="mb-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#E8F4FD' }}>
                        <span className="text-sm font-medium" style={{ color: '#3C91C5' }}>
                          Replying to comment
                        </span>
                        <button
                          onClick={handleCancelReply}
                          className="text-sm font-medium hover:underline"
                          style={{ color: '#3C91C5' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={replyingTo ? "Write your reply..." : "Post your reply..."}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none resize-none text-sm"
                      style={{ 
                        borderColor: '#e5e7eb',
                        color: '#1e293b'
                      }}
                      rows="2"
                      maxLength={1000}
                      onFocus={(e) => e.target.style.borderColor = '#3C91C5'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {commentInput.length}/1000
                      </span>
                      <button
                        onClick={handleSubmitComment}
                        disabled={!commentInput.trim() || submittingComment}
                        className="px-4 py-1.5 rounded-full font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        style={{ 
                          background: !commentInput.trim() || submittingComment ? '#94a3b8' : 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                        }}
                      >
                        {submittingComment && (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                        )}
                        <span>{submittingComment ? 'Posting...' : (replyingTo ? 'Reply' : 'Reply')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-white/40" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-3 sm:p-4">
                {post.comments && post.comments.length > 0 ? (
                  <div className="space-y-0">
                    {organizeCommentsHierarchy(post.comments).map((comment) => 
                      renderCommentThread(comment, 0)
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No comments yet. Be the first to reply!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostDetail;

