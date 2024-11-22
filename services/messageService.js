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

  async getMessages(matchObject, reqQuery) {
    const page = Number(reqQuery?.page) || 1;
    const userLimit = Number(reqQuery?.limit) || CONVERSATION_LIMIT;
    const actualLimit =
      userLimit < CONVERSATION_LIMIT ? userLimit : CONVERSATION_LIMIT;
    const skip = (page - 1) * actualLimit;
    // const limit = CONVERSATION_LIMIT;
    // const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;
    // return this.#Message
    //   .find(matchObject, null, optionsObject)
    //   .sort({ timestamp: -1 })
    //   .skip(skip)
    //   .limit(CONVERSATION_LIMIT);
    const pipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
      {
        $facet: {
          // Stage 1: Count total documents
          totalCount: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
              },
            },
          ],
          // Stage 2: Limit documents
          limitedDocuments: [{ $skip: skip }, { $limit: actualLimit }],
        },
      },
    ];

    const result = await this.#Message.aggregate(pipeline);

    // This was added so you can have hasNextPage & nextPage for infinite pagination (feed scrolling on frontEnd)
    const totalCount = result?.[0]?.totalCount?.[0]?.totalCount;
    const limitedDocuments = result?.[0]?.limitedDocuments;

    const hasNextPage = skip + limitedDocuments.length < totalCount;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      limitedDocuments,
      totalCount,
      hasNextPage,
      nextPage,
    };
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
