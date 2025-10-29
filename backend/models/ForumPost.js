const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true
    // Note: unique removed - uniqueness enforced at application level
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  pseudonym: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  parentCommentId: {
    type: String,
    default: null,
    index: true
    // If null, it's a top-level comment; if set, it's a reply to another comment
  },
  replyCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isModerated: {
    type: Boolean,
    default: true
  }
});

const forumPostSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  pseudonym: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  comments: [commentSchema],
  commentCount: {
    type: Number,
    default: 0
  },
  isModerated: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
forumPostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.commentCount = this.comments.length;
  next();
});

// Index for efficient querying
forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ firebaseUid: 1, createdAt: -1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);

