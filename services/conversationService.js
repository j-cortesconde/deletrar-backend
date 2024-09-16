const Conversation = require('../models/conversationModel');
const { CONVERSATION_LIMIT } = require('../utils/constants');

class ConversationService {
  #Conversation = Conversation;

  createConversation(conversationObject) {
    return this.#Conversation.create(conversationObject);
  }

  countConversations(matchObject) {
    return this.#Conversation.countDocuments(matchObject);
  }

  getConversations(matchObject, optionsObject, reqQuery) {
    const limit = CONVERSATION_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Conversation
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  getConversation(matchObject) {
    return this.#Conversation.findOne(matchObject);
  }

  getConversationById(conversationId, optionsObject) {
    return this.#Conversation.findById(conversationId, null, optionsObject);
  }

  updateConversation(matchObject, updateObject, updateOptions) {
    return this.#Conversation.findOneAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  deleteConversation(conversationId) {
    return this.#Conversation.findByIdAndDelete(conversationId);
  }
}

module.exports = ConversationService;
