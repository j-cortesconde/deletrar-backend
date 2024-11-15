const Message = require('../models/messageModel');
const { CONVERSATION_LIMIT } = require('../utils/constants');

class MessageService {
  #Message = Message;

  createMessage(messageObject) {
    return this.#Message.create(messageObject);
  }

  countMessages(matchObject) {
    return this.#Message.countDocuments(matchObject);
  }

  getMessages(matchObject, optionsObject, reqQuery) {
    const limit = CONVERSATION_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;
    return this.#Message
      .find(matchObject, null, optionsObject)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(CONVERSATION_LIMIT);
  }

  updateMessage(matchObject, updateObject, updateOptions) {
    return this.#Message.findOneAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  // Seem to be unused by now
  // getMessage(matchObject) {
  //   return this.#Message.findOne(matchObject);
  // }

  // getMessageById(messageId, optionsObject) {
  //   return this.#Message.findById(messageId, null, optionsObject);
  // }

  // deleteMessage(messageId) {
  //   return this.#Message.findByIdAndDelete(messageId);
  // }
}

module.exports = MessageService;
