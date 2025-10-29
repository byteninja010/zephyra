const ForumPost = require('../models/ForumPost');
const User = require('../models/User');
const { generateUniquePseudonym } = require('../utils/pseudonymGenerator');
const { moderateContent } = require('../services/moderationService');

/**
 * Set up Forum Socket.IO event handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const setupForumHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join forum room (for broadcasting)
    socket.join('forum');
    console.log(`📡 Socket ${socket.id} joined forum room`);

    // Handle new post submission
    socket.on('submit_post', async (data) => {
      try {
        console.log(`📝 Received post submission from socket ${socket.id}`);
        const { firebaseUid, content } = data;

        // Validation
        if (!firebaseUid || !content) {
          socket.emit('post_error', { error: 'Firebase UID and content are required' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('post_error', { error: 'Content exceeds maximum length of 2000 characters' });
          return;
        }

        // Get user and ensure they have a pseudonym
        const user = await User.findOne({ firebaseUid, isActive: true });
        if (!user) {
          socket.emit('post_error', { error: 'User not found' });
          return;
        }

        if (!user.pseudonym) {
          const pseudonym = await generateUniquePseudonym(User);
          user.pseudonym = pseudonym;
          await user.save();
          console.log(`✅ Generated pseudonym for user ${firebaseUid}: ${pseudonym}`);
        }

        console.log(`🤖 Moderating post from ${user.pseudonym}...`);
        const startTime = Date.now();

        // Moderate content with Gemini 2.5 Flash
        const moderationResult = await moderateContent(content, 'post');
        
        const moderationTime = Date.now() - startTime;
        console.log(`⏱️ Moderation completed in ${moderationTime}ms`);

        // If rejected, notify only the sender
        if (moderationResult.verdict === 'reject') {
          console.log(`❌ Post rejected: ${moderationResult.reason}`);
          socket.emit('post_rejected', {
            reason: moderationResult.reason,
            message: 'Your post was not published. Here\'s why: ' + moderationResult.reason,
            timestamp: new Date().toISOString()
          });
          return;
        }

        // If accepted, save and broadcast
        console.log(`✅ Post accepted: ${moderationResult.reason}`);
        
        const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const post = new ForumPost({
          postId,
          firebaseUid,
          pseudonym: user.pseudonym,
          content,
          isModerated: true
        });

        await post.save();
        console.log(`💾 Post saved to database: ${postId}`);

        // Broadcast to all users in the forum room
        const postData = {
          postId: post.postId,
          firebaseUid: post.firebaseUid,
          pseudonym: post.pseudonym,
          content: post.content,
          commentCount: post.commentCount,
          createdAt: post.createdAt,
          timestamp: new Date().toISOString()
        };

        io.to('forum').emit('new_post', postData);
        console.log(`📡 Broadcasted new post to all users in forum`);

        // Notify sender of success
        socket.emit('post_accepted', {
          post: postData,
          message: 'Your post has been published successfully'
        });

      } catch (error) {
        console.error('❌ Error handling post submission:', error);
        socket.emit('post_error', { 
          error: 'Failed to process post',
          details: error.message 
        });
      }
    });

    // Handle new comment submission
    socket.on('submit_comment', async (data) => {
      try {
        console.log(`💬 Received comment submission from socket ${socket.id}`);
        const { firebaseUid, postId, content, parentCommentId } = data;

        // Validation
        if (!firebaseUid || !postId || !content) {
          socket.emit('comment_error', { error: 'Firebase UID, post ID, and content are required' });
          return;
        }

        if (content.length > 1000) {
          socket.emit('comment_error', { error: 'Comment exceeds maximum length of 1000 characters' });
          return;
        }

        // Get post
        const post = await ForumPost.findOne({ postId });
        if (!post) {
          socket.emit('comment_error', { error: 'Post not found' });
          return;
        }

        // If this is a reply, validate that parent comment exists
        if (parentCommentId) {
          const parentComment = post.comments.find(c => c.commentId === parentCommentId);
          if (!parentComment) {
            socket.emit('comment_error', { error: 'Parent comment not found', postId });
            return;
          }
        }

        // Get user and ensure they have a pseudonym
        const user = await User.findOne({ firebaseUid, isActive: true });
        if (!user) {
          socket.emit('comment_error', { error: 'User not found' });
          return;
        }

        if (!user.pseudonym) {
          const pseudonym = await generateUniquePseudonym(User);
          user.pseudonym = pseudonym;
          await user.save();
          console.log(`✅ Generated pseudonym for user ${firebaseUid}: ${pseudonym}`);
        }

        console.log(`🤖 Moderating ${parentCommentId ? 'reply' : 'comment'} from ${user.pseudonym}...`);
        const startTime = Date.now();

        // Moderate content with Gemini 2.5 Flash
        const moderationResult = await moderateContent(content, 'comment');
        
        const moderationTime = Date.now() - startTime;
        console.log(`⏱️ Moderation completed in ${moderationTime}ms`);

        // If rejected, notify only the sender
        if (moderationResult.verdict === 'reject') {
          console.log(`❌ Comment rejected: ${moderationResult.reason}`);
          socket.emit('comment_rejected', {
            postId,
            parentCommentId,
            reason: moderationResult.reason,
            message: 'Your comment was not published. Here\'s why: ' + moderationResult.reason,
            timestamp: new Date().toISOString()
          });
          return;
        }

        // If accepted, save and broadcast
        console.log(`✅ Comment accepted: ${moderationResult.reason}`);
        
        const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const comment = {
          commentId,
          firebaseUid,
          pseudonym: user.pseudonym,
          content,
          parentCommentId: parentCommentId || null,
          replyCount: 0,
          createdAt: new Date(),
          isModerated: true
        };

        // If this is a reply, increment parent comment's replyCount
        if (parentCommentId) {
          const parentComment = post.comments.find(c => c.commentId === parentCommentId);
          if (parentComment) {
            parentComment.replyCount = (parentComment.replyCount || 0) + 1;
          }
        }

        post.comments.push(comment);
        await post.save();
        console.log(`💾 ${parentCommentId ? 'Reply' : 'Comment'} saved to database: ${commentId}`);

        // Broadcast to all users in the forum room
        const commentData = {
          commentId: comment.commentId,
          postId: post.postId,
          firebaseUid: comment.firebaseUid,
          pseudonym: comment.pseudonym,
          content: comment.content,
          parentCommentId: comment.parentCommentId,
          replyCount: comment.replyCount,
          createdAt: comment.createdAt,
          timestamp: new Date().toISOString()
        };

        io.to('forum').emit('new_comment', commentData);
        console.log(`📡 Broadcasted new comment to all users in forum`);

        // Notify sender of success
        socket.emit('comment_accepted', {
          comment: commentData,
          message: 'Your comment has been published successfully'
        });

      } catch (error) {
        console.error('❌ Error handling comment submission:', error);
        socket.emit('comment_error', { 
          error: 'Failed to process comment',
          details: error.message 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log('✅ Forum Socket.IO handlers initialized');
};

module.exports = { setupForumHandlers };

