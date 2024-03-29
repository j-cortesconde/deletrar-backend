const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A post must have a title'],
      trim: true,
      maxlength: [40, 'A post title must have less or equal to 40 characters'],
    },
    content: {
      type: String,
      required: [true, 'A post must have content'],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A post must have a summary'],
    },
    imageCover: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    status: {
      type: String,
      default: 'posted',
      enum: ['editing', 'posted', 'deleted'],
    },
    // owner: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
