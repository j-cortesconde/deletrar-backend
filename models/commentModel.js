const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'A comment must have content'],
      trim: true,
      maxlength: [400, 'A comment must have less than 400 characters'],
    },
    author: {
      type: String,
      ref: 'User',
    },
    targetPost: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
    },
    targetCollection: {
      type: mongoose.Schema.ObjectId,
      ref: 'Collection',
    },
    replyingTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment',
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    status: {
      type: String,
      default: 'posted',
      enum: ['posted', 'deleted'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'author',
    model: 'User',
    select: 'name photo username',
    foreignField: 'username',
  });
  next();
});

commentSchema.virtual('reply', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'replyingTo',
  justOne: true,
});

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'replyingTo',
  count: true,
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
