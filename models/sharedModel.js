const mongoose = require('mongoose');

const sharedSchema = new mongoose.Schema(
  {
    content: { type: String },
    sharedPost: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
    },
    sharedCollection: {
      type: mongoose.Schema.ObjectId,
      ref: 'Collection',
    },
    sharedComment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment',
    },
    postedAt: {
      type: Date,
      default: Date.now(),
    },
    status: {
      type: String,
      default: 'posted',
      enum: ['posted', 'deleted'],
    },
    sharer: {
      type: String,
      ref: 'User',
      required: [true, 'Shared must have a sharer'],
    },
    settings: {
      public: {
        type: Boolean,
        default: true,
      },
    },
    documentType: {
      type: String,
      default: 'shared',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

sharedSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'sharer',
    model: 'User',
    select: 'name photo username',
    foreignField: 'username',
  });

  next();
});

const Shared = mongoose.model('Shared', sharedSchema);

module.exports = Shared;
