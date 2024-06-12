const Conversation = require('../models/conversationModel');
const { CONVERSATION_LIMIT } = require('../utils/constants');

class ConversationService {
  #Model = Conversation;

  createConversation(conversationObject) {
    return this.#Model.create(conversationObject);
  }

  countConversations(matchObject) {
    return this.#Model.countDocuments(matchObject);
  }

  getConversations(matchObject, optionsObject, reqQuery) {
    const limit = CONVERSATION_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Model
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  getConversation(matchObject) {
    return this.#Model.findOne(matchObject);
  }

  getConversationById(conversationId, optionsObject) {
    return this.#Model.findById(conversationId, null, optionsObject);
  }

  updateConversation(matchObject, updateObject, updateOptions) {
    return this.#Model.findOneAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  deleteConversation(conversationId) {
    return this.#Model.findByIdAndDelete(conversationId);
  }
}

module.exports = ConversationService;
