const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'A message must have content'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    messenger: {
      type: String,
      ref: 'User',
      required: [true, 'A message must have a messenger'],
    },
    // TODO: For now conversations will be between two people, so read is always a matter of the user that isnt messenger
    read: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

module.exports = messageSchema;
