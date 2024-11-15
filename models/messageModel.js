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
    conversation: {
      type: mongoose.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'A message must be a part of a conversation'],
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
    documentType: {
      type: String,
      default: 'message',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
