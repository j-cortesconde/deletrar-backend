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
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// postSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'author',
//     select: 'name photo',
//   });
//   next();
// });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
