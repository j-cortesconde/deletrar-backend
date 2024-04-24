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
      type: Object,
      required: [true, 'A post must have content'],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A post must have a summary'],
    },
    coverImage: {
      type: String,
      default: 'default.jpg',
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    postedAt: Date,
    updatedAt: Date,
    status: {
      type: String,
      default: 'editing',
      enum: ['editing', 'posted', 'deleted'],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },
    settings: {
      public: {
        type: Boolean,
        default: true,
      },
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    previousVersion: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'author',
    select: 'name photo',
  });
  next();
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
