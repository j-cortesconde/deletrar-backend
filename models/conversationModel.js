// TODO: See how to handle very long conversations
// TODO: Fix conversation sorting when getting the list of a user's conversations
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
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
    // TODO: No settings yet, but could be user specific settings
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

conversationSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'participants',
    model: 'User',
    select: 'name photo username active',
    foreignField: 'username',
  });
  next();
});

// Virtual field to populate last message
conversationSchema.virtual('lastMessage', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation',
  justOne: true,
  options: { sort: { timestamp: -1 } }, // Get the most recent message
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
