import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import socketService from '../services/socketService';
import authService from '../services/authService';

const Forum = () => {
  const navigate = useNavigate();
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [pseudonym, setPseudonym] = useState('');
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingComments, setSubmittingComments] = useState({}); // Track which posts have comments being submitted
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState({}); // Track which comment is being replied to { postId: commentId }
  const [notification, setNotification] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my-posts'
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const newPostRef = useRef(null);

  // Track window size for responsive comment nesting
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show notification (needs to be defined before use in other callbacks)
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Filter posts based on search query and active tab
  useEffect(() => {
    let result = posts;

    // Filter by tab
    if (activeTab === 'my-posts') {
      result = result.filter(post => post.firebaseUid === firebaseUid);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(post => 
        post.content.toLowerCase().includes(query) ||
        post.pseudonym.toLowerCase().includes(query)
      );
    }

    setFilteredPosts(result);
  }, [posts, searchQuery, activeTab, firebaseUid]);

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

  // Load forum posts
  const loadPosts = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/forum/posts?page=${pageNum}&limit=20`);
      
      if (response.data.success) {
        if (pageNum === 1) {
          setPosts(response.data.posts);
        } else {
          setPosts(prev => [...prev, ...response.data.posts]);
        }
        
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      }
    } catch (error) {
      showNotification('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Set up Socket.IO event listeners
  const setupSocketListeners = useCallback(() => {
    // Listen for new posts from other users
    socketService.onNewPost((data) => {
      setPosts(prev => [data, ...prev]);
    });

    // Listen for new comments from other users
    socketService.onNewComment((data) => {
      setPosts(prev => prev.map(post => {
        if (post.postId === data.postId) {
          return {
            ...post,
            comments: [...(post.comments || []), data],
            commentCount: (post.commentCount || 0) + 1
          };
        }
        return post;
      }));
    });

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
    });

    // Listen for own post rejection
    socketService.onPostRejected((data) => {
      showNotification(`Post not published: ${data.reason}`, 'error');
      setSubmittingPost(false);
      setNewPostContent('');
    });

    // Listen for own comment acceptance
    socketService.onCommentAccepted((data) => {
      showNotification('Your comment has been published!', 'success');
      const postId = data.comment.postId;
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setSubmittingComments(prev => ({ ...prev, [postId]: false }));
      // Clear reply state
      setReplyingTo(prev => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
    });

    // Listen for own comment rejection
    socketService.onCommentRejected((data) => {
      showNotification(`Comment not published: ${data.reason}`, 'error');
      setSubmittingComments(prev => ({ ...prev, [data.postId]: false }));
      setCommentInputs(prev => ({ ...prev, [data.postId]: '' }));
      // Clear reply state
      setReplyingTo(prev => {
        const newState = { ...prev };
        delete newState[data.postId];
        return newState;
      });
    });

    // Listen for errors
    socketService.onPostError((data) => {
      showNotification('Failed to submit post: ' + data.error, 'error');
      setSubmittingPost(false);
      setNewPostContent('');
    });

    socketService.onCommentError((data) => {
      showNotification('Failed to submit comment: ' + data.error, 'error');
      // Clear submitting state for the specific post
      if (data.postId) {
        setSubmittingComments(prev => ({ ...prev, [data.postId]: false }));
        setCommentInputs(prev => ({ ...prev, [data.postId]: '' }));
      }
    });
  }, [showNotification]);

  // Initialize and load data
  useEffect(() => {
    // Check if user is logged in (matching Dashboard's auth pattern)
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
    loadPosts();

    // Set up Socket.IO listeners
    setupSocketListeners();

    // Cleanup on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [navigate, loadPseudonym, loadPosts, setupSocketListeners]);

  // Load comments for a specific post
  const loadPostComments = async (postId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forum/posts/${postId}`);
      if (response.data.success) {
        // Update the post in the list with full comment data
        setPosts(prev => prev.map(post => 
          post.postId === postId 
            ? { ...post, comments: response.data.post.comments }
            : post
        ));
      }
    } catch (error) {
      // Error loading comments
    }
  };

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

  // Submit comment (or reply)
  const handleSubmitComment = (postId) => {
    const content = commentInputs[postId] || '';
    const parentCommentId = replyingTo[postId] || null;
    
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

    setSubmittingComments(prev => ({ ...prev, [postId]: true }));
    showNotification('AI is checking your comment...', 'info');
    socketService.submitComment(firebaseUid, postId, content, parentCommentId);
  };

  // Start replying to a comment
  const handleReplyToComment = (postId, commentId, pseudonym) => {
    setReplyingTo(prev => ({ ...prev, [postId]: commentId }));
    setCommentInputs(prev => ({ ...prev, [postId]: `@${pseudonym} ` }));
  };

  // Cancel reply
  const handleCancelReply = (postId) => {
    setReplyingTo(prev => {
      const newState = { ...prev };
      delete newState[postId];
      return newState;
    });
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
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
  const renderCommentThread = (comment, postId, depth = 0) => {
    const isAuthor = comment.firebaseUid === firebaseUid;
    const hasReplies = comment.replies && comment.replies.length > 0;

    // Responsive padding: smaller on mobile, larger on desktop
    // Cap depth at 5 to prevent excessive nesting on mobile
    const effectiveDepth = Math.min(depth, 5);
    const mobilePadding = effectiveDepth * 12; // 12px per level on mobile
    const desktopPadding = effectiveDepth * 48; // 48px per level on desktop

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
          
          {/* Avatar - with solid background to cover threading lines */}
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
                  onClick={() => handleDeleteComment(postId, comment.commentId)}
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
              onClick={() => handleReplyToComment(postId, comment.commentId, comment.pseudonym)}
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
            {comment.replies.map((reply) => renderCommentThread(reply, postId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/forum/posts/${postId}`, {
        data: { firebaseUid }
      });

      if (response.data.success) {
        // Remove post from local state
        setPosts(prev => prev.filter(post => post.postId !== postId));
        showNotification('Post deleted successfully', 'success');
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete post', 'error');
    }
  };

  // Delete comment
  const handleDeleteComment = async (postId, commentId) => {
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
        
        // Remove all deleted comments from local state using the deletedIds array
        setPosts(prev => prev.map(post => {
          if (post.postId === postId) {
            // Filter out all deleted comments by their IDs
            const updatedComments = post.comments.filter(c => !deletedIds.includes(c.commentId));
            
            return {
              ...post,
              comments: updatedComments,
              commentCount: Math.max(0, post.commentCount - deletedCount)
            };
          }
          return post;
        }));
        
        const message = deletedCount > 1 
          ? `Comment and ${deletedCount - 1} ${deletedCount === 2 ? 'reply' : 'replies'} deleted successfully`
          : 'Comment deleted successfully';
        showNotification(message, 'success');
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to delete comment', 'error');
    }
  };

  // Toggle post expansion
  const togglePost = (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      loadPostComments(postId);
    }
  };

  // Generate unique color for each pseudonym
  const getAvatarGradient = (pseudonym) => {
    if (!pseudonym) return 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)';
    
    // Generate a hash from the pseudonym
    let hash = 0;
    for (let i = 0; i < pseudonym.length; i++) {
      hash = pseudonym.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Define color palette matching the theme
    const gradients = [
      'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)', // Blue
      'linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)', // Teal
      'linear-gradient(135deg, #4A9FB5 0%, #3C91C5 100%)', // Light Blue
      'linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)', // Aqua
      'linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)', // Blue-Teal
      'linear-gradient(135deg, #5A7D95 0%, #4A9FB5 100%)', // Teal-Blue
      'linear-gradient(135deg, #6BA3BC 0%, #3C91C5 100%)', // Sky Blue
      'linear-gradient(135deg, #3C91C5 0%, #6BA3BC 100%)', // Deep Blue
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
        {/* Floating Background Bubbles - Evenly Distributed */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Row 1 - Top */}
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
          <div
            className="absolute top-16 left-[90%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)",
              animation: "float 7s ease-in-out infinite",
              animationDelay: "4s"
            }}
          ></div>

          {/* Row 2 - Middle-Top */}
          <div
            className="absolute top-[35%] left-[15%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)",
              animation: "float 9s ease-in-out infinite",
              animationDelay: "0.5s"
            }}
          ></div>
          <div
            className="absolute top-[40%] left-[40%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              animation: "float 8s ease-in-out infinite",
              animationDelay: "1.5s"
            }}
          ></div>
          <div
            className="absolute top-[35%] left-[65%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)",
              animation: "float 7s ease-in-out infinite",
              animationDelay: "2.5s"
            }}
          ></div>
          <div
            className="absolute top-[40%] left-[85%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)",
              animation: "float 9s ease-in-out infinite",
              animationDelay: "3.5s"
            }}
          ></div>

          {/* Row 3 - Middle-Bottom */}
          <div
            className="absolute top-[65%] left-[10%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)",
              animation: "float 8s ease-in-out infinite",
              animationDelay: "1s"
            }}
          ></div>
          <div
            className="absolute top-[60%] left-[35%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #5A7D95 0%, #77A3B8 100%)",
              animation: "float 9s ease-in-out infinite",
              animationDelay: "2s"
            }}
          ></div>
          <div
            className="absolute top-[65%] left-[60%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #77A3B8 0%, #5A7D95 100%)",
              animation: "float 7s ease-in-out infinite",
              animationDelay: "3s"
            }}
          ></div>
          <div
            className="absolute top-[60%] left-[85%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)",
              animation: "float 8s ease-in-out infinite",
              animationDelay: "4s"
            }}
          ></div>

          {/* Row 4 - Bottom */}
          <div
            className="absolute bottom-16 left-[20%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #5A7D95 0%, #3C91C5 100%)",
              animation: "float 9s ease-in-out infinite",
              animationDelay: "0.5s"
            }}
          ></div>
          <div
            className="absolute bottom-20 left-[45%] w-24 h-24 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #77A3B8 0%, #3C91C5 100%)",
              animation: "float 8s ease-in-out infinite",
              animationDelay: "1.5s"
            }}
          ></div>
          <div
            className="absolute bottom-16 left-[75%] w-20 h-20 rounded-full opacity-15"
            style={{
              background: "linear-gradient(135deg, #3C91C5 0%, #77A3B8 100%)",
              animation: "float 7s ease-in-out infinite",
              animationDelay: "2.5s"
            }}
          ></div>
        </div>

      {/* Header - Twitter Style */}
      <div className="dashboard-card bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3">
            {/* Left: Logo & Back */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-blue-50 transition-colors"
                style={{ color: '#3C91C5' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: '#1e293b' }}>Support Forum</h1>
                  <div className="relative mt-1">
                    <div
                      onMouseEnter={() => setShowInfoTooltip(true)}
                      onMouseLeave={() => setShowInfoTooltip(false)}
                      className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor:'#3C91C5' ,
                        color: '#ffffff'
                      }}
                    >
                      <span className="text-xs font-bold">i</span>
                    </div>
                    {showInfoTooltip && (
                      <div className="absolute top-7 left-1/2 z-50" style={{ transform: 'translateX(-50%)' }}>
                        <div className="bg-gray-900 text-white text-sm rounded-lg px-4 py-3 shadow-xl whitespace-nowrap">
                          <div className="absolute -top-1 left-1/2 w-2 h-2 bg-gray-900 rotate-45" style={{ transform: 'translateX(-50%)' }}></div>
                          <p className="font-semibold mb-1">🛡️ AI Moderated Forum</p>
                          <p className="text-gray-300 text-xs">All posts and comments are automatically</p>
                          <p className="text-gray-300 text-xs">reviewed by AI before being posted to</p>
                          <p className="text-gray-300 text-xs text-start">ensure a safe space for everyone.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Right: Profile Badge */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full" style={{ backgroundColor: '#E8F4FD' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: getAvatarGradient(pseudonym) }}>
                  {pseudonym?.[0] || '?'}
                </div>
                <span className="text-sm font-medium" style={{ color: '#475569' }}>
                  You are {pseudonym || 'Loading...'}
                </span>
              </div>
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

      {/* Main Container - Twitter Layout */}
      <div className="relative z-10 max-w-6xl mx-auto flex gap-4 sm:gap-6 pt-4 sm:pt-6 px-2 sm:px-4 pb-20">
        {/* Main Feed Column */}
        <div className="flex-1 max-w-2xl mx-auto">
          {/* Compose Post Card - Twitter Style */}
          <div ref={newPostRef} className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm mb-3 sm:mb-4 border border-white/40" style={{ borderColor: '#e5e7eb' }}>
            <div className="p-3 sm:p-4">
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
                    style={{ color: '#1e293b', minHeight: '50px' }}
                    maxLength={2000}
                    disabled={submittingPost}
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs" style={{ color: '#64748b' }}>
                        {newPostContent.length}/2000
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E8F4FD', color: '#3C91C5' }}>
                        🛡️ AI Moderated
                      </span>
                    </div>
                    <button
                      onClick={handleSubmitPost}
                      disabled={submittingPost || !newPostContent.trim()}
                      className="px-5 py-2 rounded-full font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      style={{ 
                        background: submittingPost || !newPostContent.trim() ? '#94a3b8' : 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                        boxShadow: submittingPost || !newPostContent.trim() ? 'none' : '0 2px 8px rgba(60, 145, 197, 0.3)'
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

          {/* Tabs & Search Section */}
          <div className="dashboard-card bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm mb-4 border border-white/40" style={{ borderColor: '#e5e7eb' }}>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
              <button
                onClick={() => setActiveTab('all')}
                className="flex-1 px-4 py-3 text-sm font-semibold transition-colors relative"
                style={{ 
                  color: activeTab === 'all' ? '#3C91C5' : '#64748b'
                }}
              >
                All Posts
                {activeTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('my-posts')}
                className="flex-1 px-4 py-3 text-sm font-semibold transition-colors relative"
                style={{ 
                  color: activeTab === 'my-posts' ? '#3C91C5' : '#64748b'
                }}
              >
                My Posts
                {activeTab === 'my-posts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t" style={{ background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)' }}></div>
                )}
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: '#e5e7eb',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3C91C5';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#f8fafc';
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading && filteredPosts.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-12 text-center border border-white/40" style={{ borderColor: '#e5e7eb' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-4 mx-auto" style={{ borderColor: '#e5e7eb', borderTopColor: '#3C91C5' }}></div>
                <p className="mt-4" style={{ color: '#64748b' }}>Loading posts...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-12 text-center border border-white/40" style={{ borderColor: '#e5e7eb' }}>
                <svg className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>
                  {searchQuery ? 'No posts found' : 'No posts yet'}
                </h3>
                <p style={{ color: '#64748b' }}>
                  {searchQuery ? 'Try adjusting your search' : 'Be the first to share something!'}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.postId} className="dashboard-card bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-white/40 transition-all hover:shadow-md" style={{ borderColor: '#e5e7eb' }}>
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
                      
                      {/* Delete button - only show for post author */}
                      {post.firebaseUid === firebaseUid && (
                        <button
                          onClick={() => handleDeletePost(post.postId)}
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
                      <button
                        onClick={() => togglePost(post.postId)}
                        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full transition-colors group"
                        style={{ color: expandedPostId === post.postId ? '#3C91C5' : '#64748b' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F4FD'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">{post.commentCount || 0}</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {expandedPostId === post.postId && (
                      <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: '#f1f5f9' }}>
                        {/* Comment Input */}
                        <div className="flex space-x-2 sm:space-x-3 ml-0 sm:ml-12 md:ml-15">
                          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs" style={{ background: getAvatarGradient(pseudonym) }}>
                            {pseudonym?.[0] || '?'}
                          </div>
                          <div className="flex-1">
                            {replyingTo[post.postId] && (
                              <div className="mb-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#E8F4FD' }}>
                                <span className="text-sm font-medium" style={{ color: '#3C91C5' }}>
                                  Replying to comment
                                </span>
                                <button
                                  onClick={() => handleCancelReply(post.postId)}
                                  className="text-sm font-medium hover:underline"
                                  style={{ color: '#3C91C5' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            <textarea
                              value={commentInputs[post.postId] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.postId]: e.target.value }))}
                              placeholder={replyingTo[post.postId] ? "Write your reply..." : "Post your reply..."}
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
                                {(commentInputs[post.postId] || '').length}/1000
                              </span>
                              <button
                                onClick={() => handleSubmitComment(post.postId)}
                                disabled={!commentInputs[post.postId]?.trim() || submittingComments[post.postId]}
                                className="px-4 py-1.5 rounded-full font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                style={{ 
                                  background: !commentInputs[post.postId]?.trim() || submittingComments[post.postId] ? '#94a3b8' : 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)'
                                }}
                              >
                                {submittingComments[post.postId] && (
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                )}
                                <span>{submittingComments[post.postId] ? 'Posting...' : (replyingTo[post.postId] ? 'Reply' : 'Reply')}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Comments List - Hierarchical/Threaded */}
                        <div className="ml-0 sm:ml-12 md:ml-15">
                          {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-0">
                              {organizeCommentsHierarchy(post.comments).map((comment) => 
                                renderCommentThread(comment, post.postId, 0)
                              )}
                            </div>
                          ) : (
                            <div className="py-8 text-center">
                              <p className="text-sm" style={{ color: '#94a3b8' }}>No comments yet. Be the first to reply!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && !loading && filteredPosts.length > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  loadPosts(nextPage);
                }}
                className="px-6 py-3 rounded-full font-semibold text-white transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #3C91C5 0%, #5A7D95 100%)',
                  boxShadow: '0 2px 8px rgba(60, 145, 197, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Load More Posts
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default Forum;

