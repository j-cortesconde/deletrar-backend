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
