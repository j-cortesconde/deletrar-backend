const Conversation = require('../models/conversationModel');
const { AGGREGATION_LIMIT } = require('../utils/constants');

class ConversationService {
  #Conversation = Conversation;

  createConversation(conversationObject) {
    return this.#Conversation.create(conversationObject);
  }

  countConversations(matchObject) {
    return this.#Conversation.countDocuments(matchObject);
  }

  async getConversations(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $project: {
          _id: 1,
          participants: 1,
          documentType: 1,
          createdAt: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: 'username',
          pipeline: [{ $project: { _id: 1, username: 1, name: 1, photo: 1 } }],
          as: 'participants',
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'conversation',
          pipeline: [{ $sort: { timestamp: -1 } }, { $limit: 1 }],
          as: 'lastMessage',
        },
      },
      // The message document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
        },
      },
    ];

    const allConversations = await this.#Conversation.aggregate(basePipeline);

    // Sort the conversations array by the lastMessage timestamp (Didnt manage to make this work in the aggregation pipeline)
    const sortedConversations = allConversations.sort(
      (a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp, // Sort descending (most recent first)
    );

    // Paginate the sorted array (must also do it outside aggregation since I want to paginate AFTER sort)
    const page = Number(reqQuery?.page) || 1;
    const userLimit = Number(reqQuery?.limit) || AGGREGATION_LIMIT;
    const actualLimit =
      userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;

    const startIndex = (page - 1) * actualLimit;
    const paginatedConversations = sortedConversations.slice(
      startIndex,
      startIndex + actualLimit,
    );

    // This was added so you can have hasNextPage & nextPage for infinite pagination (feed scrolling on frontEnd)
    const totalCount = allConversations.length;
    const skip = (page - 1) * actualLimit;

    const hasNextPage = skip + paginatedConversations.length < totalCount;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      conversations: paginatedConversations,
      totalCount,
      hasNextPage,
      nextPage,
    };
  }

  getConversation(matchObject, optionsObject) {
    return this.#Conversation.findOne(matchObject, null, optionsObject);
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
