const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A collection must have a title'],
      trim: true,
      maxlength: [
        40,
        'A collection title must have less or equal to 40 characters',
      ],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [60, "The subtitle can't have more than 60 characters"],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A collection must have a summary'],
    },
    coverImage: {
      type: String,
      default: 'default.jpg',
    },
    posts: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Post',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    sharedAt: Date,
    updatedAt: Date,
    status: {
      type: String,
      default: 'saved',
      enum: ['saved', 'shared', 'deleted'],
    },
    collector: {
      type: String,
      ref: 'User',
      required: [true, 'Collection must have an collector'],
    },
    settings: {
      public: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
