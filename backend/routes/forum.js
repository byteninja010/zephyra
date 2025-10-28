const express = require('express');
const ForumPost = require('../models/ForumPost');
const User = require('../models/User');
const { generateUniquePseudonym } = require('../utils/pseudonymGenerator');
const { moderateContent } = require('../services/moderationService');
const router = express.Router();

// Get or create pseudonym for user
router.get('/pseudonym/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid, isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user already has a pseudonym, return it
    if (user.pseudonym) {
      return res.json({
        success: true,
        pseudonym: user.pseudonym
      });
    }

    // Generate a new pseudonym
    const pseudonym = await generateUniquePseudonym(User);
    user.pseudonym = pseudonym;
    await user.save();

    console.log(`✅ Generated pseudonym for user ${firebaseUid}: ${pseudonym}`);

    res.json({
      success: true,
      pseudonym: pseudonym,
      message: 'Pseudonym created successfully'
    });

  } catch (error) {
    console.error('Error getting/creating pseudonym:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all forum posts (paginated)
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await ForumPost.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('postId firebaseUid pseudonym content commentCount createdAt updatedAt');

    const totalPosts = await ForumPost.countDocuments({ isActive: true });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPosts,
        totalPages: Math.ceil(totalPosts / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting forum posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific post with comments
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findOne({ postId, isActive: true });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      success: true,
      post: {
        postId: post.postId,
        firebaseUid: post.firebaseUid,
        pseudonym: post.pseudonym,
        content: post.content,
        comments: post.comments, // Comments already include firebaseUid from schema
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post (will be moderated via Socket.IO, this is fallback REST endpoint)
router.post('/posts', async (req, res) => {
  try {
    const { firebaseUid, content } = req.body;

    if (!firebaseUid || !content) {
      return res.status(400).json({ error: 'Firebase UID and content are required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds maximum length of 2000 characters' });
    }

    // Get user and ensure they have a pseudonym
    const user = await User.findOne({ firebaseUid, isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pseudonym) {
      const pseudonym = await generateUniquePseudonym(User);
      user.pseudonym = pseudonym;
      await user.save();
    }

    console.log(`📝 Moderating post from ${user.pseudonym}...`);

    // Moderate content
    const moderationResult = await moderateContent(content, 'post');

    if (moderationResult.verdict === 'reject') {
      console.log(`❌ Post rejected: ${moderationResult.reason}`);
      return res.status(403).json({
        success: false,
        rejected: true,
        reason: moderationResult.reason,
        message: 'Your post was not published for safety reasons'
      });
    }

    // Create post
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const post = new ForumPost({
      postId,
      firebaseUid,
      pseudonym: user.pseudonym,
      content,
      isModerated: true
    });

    await post.save();

    console.log(`✅ Post accepted and published: ${postId}`);

    res.json({
      success: true,
      post: {
        postId: post.postId,
        pseudonym: post.pseudonym,
        content: post.content,
        commentCount: post.commentCount,
        createdAt: post.createdAt
      },
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment to a post (will be moderated via Socket.IO, this is fallback REST endpoint)
router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { firebaseUid, content } = req.body;

    if (!firebaseUid || !content) {
      return res.status(400).json({ error: 'Firebase UID and content are required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment exceeds maximum length of 1000 characters' });
    }

    // Get post
    const post = await ForumPost.findOne({ postId, isActive: true });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get user and ensure they have a pseudonym
    const user = await User.findOne({ firebaseUid, isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pseudonym) {
      const pseudonym = await generateUniquePseudonym(User);
      user.pseudonym = pseudonym;
      await user.save();
    }

    console.log(`💬 Moderating comment from ${user.pseudonym}...`);

    // Moderate content
    const moderationResult = await moderateContent(content, 'comment');

    if (moderationResult.verdict === 'reject') {
      console.log(`❌ Comment rejected: ${moderationResult.reason}`);
      return res.status(403).json({
        success: false,
        rejected: true,
        reason: moderationResult.reason,
        message: 'Your comment was not published for safety reasons'
      });
    }

    // Add comment
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      commentId,
      firebaseUid,
      pseudonym: user.pseudonym,
      content,
      createdAt: new Date(),
      isModerated: true
    };

    post.comments.push(comment);
    await post.save();

    console.log(`✅ Comment accepted and published: ${commentId}`);

    res.json({
      success: true,
      comment: {
        commentId: comment.commentId,
        pseudonym: comment.pseudonym,
        content: comment.content,
        createdAt: comment.createdAt
      },
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a post (only by author)
router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    const post = await ForumPost.findOne({ postId, isActive: true });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is the author
    if (post.firebaseUid !== firebaseUid) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a comment (only by author)
router.delete('/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }

    const post = await ForumPost.findOne({ postId, isActive: true });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const commentIndex = post.comments.findIndex(c => c.commentId === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the author
    if (post.comments[commentIndex].firebaseUid !== firebaseUid) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Remove comment
    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own posts
router.get('/my-posts/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await ForumPost.find({ firebaseUid, isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('postId pseudonym content commentCount createdAt updatedAt');

    const totalPosts = await ForumPost.countDocuments({ firebaseUid, isActive: true });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPosts,
        totalPages: Math.ceil(totalPosts / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting user posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

