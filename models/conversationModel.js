// TODO: Remove 'read' functionality. I no longer care for it.
// TODO: See how to handle very long conversations
// TODO: Fix conversation sorting when getting the list of a user's conversations
const mongoose = require('mongoose');
const messageSchema = require('./messageModel');

const conversationSchema = new mongoose.Schema(
  {
    messages: [messageSchema],
    participants: [
      {
        type: String,
        ref: 'User',
      },
    ],
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    documentType: {
      type: String,
      default: 'conversation',
    },
    read: {
      type: Boolean,
      default: false,
    },
    lastMessageTimestamp: {
      type: Date,
      default: Date.now,
    },
    // TODO: No settings yet, but could be user specific settings
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

conversationSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'participants',
    model: 'User',
    select: 'name photo username',
    foreignField: 'username',
  });
  next();
});

conversationSchema.virtual('lastMessage').get(function () {
  if (this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
