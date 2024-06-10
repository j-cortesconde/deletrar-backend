const AppError = require('../utils/appError');
const ConversationService = require('../services/conversationService');

class ConversationController {
  #service = new ConversationService();

  // Function that checks if theres a conversation. If it already exists, returns it, else it creates and returns a new conversation after recieving a request body with keys [addressee, message]
  createConversation = async (req, res, next) => {
    const doc = this.#service.getConversation({
      participants: { $all: [req.user.username, req.body.addressee] },
    });

    if (doc) {
      res.status(200).json({
        status: 'success',
        data: doc,
      });
    } else {
      const newConversation = {
        participants: [req.user.username, req.body.addressee],
        messages: [
          {
            content: req.body.message,
            messenger: req.user.username,
          },
        ],
      };

      const newDoc = await this.#service.createConversation(newConversation);

      res.status(200).json({
        status: 'success',
        data: newDoc,
      });
    }
  };

  // Pushes a new message to the messages array of the given id's conversation
  sendMessage = async (req, res, next) => {
    const newMessage = {
      content: req.body.message,
      messenger: req.user.username,
    };

    const oldDoc = await this.#service.getConversationById(
      req.params.conversationId,
    );

    if (!oldDoc) {
      return next(new AppError('No conversation found with that ID', 404));
    }

    if (!oldDoc.participants.includes(req.user.username)) {
      return next(new AppError("You aren't part of this conversation", 400));
    }

    const doc = this.#service.updateConversation(
      req.params.conversationId,
      {
        $push: { messages: newMessage },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  getConversationsByUsername = async (req, res, next) => {
    const matchObject = {
      participants: req.user.username,
    };

    const populate = 'lastMessage';
    // TODO: Punto de falla
    const sort = { lastMessage: { timestamp: -1 } };

    const totalDocs = await this.#service.countConversations(matchObject);

    const paginatedDocs = await this.#service.getConversations(
      matchObject,
      { populate, sort },
      req.query,
    );

    const response = {
      count: totalDocs,
      docs: paginatedDocs,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  };

  getConversationById = async (req, res, next) => {
    const doc = await this.#service.getConversationById(
      req.params.conversationId,
    );

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ninguna conversación con ese ID.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  adminDeleteConversation = async (req, res, next) => {
    const doc = await this.#service.deleteConversation(
      req.params.conversationId,
    );

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };
}

module.exports = ConversationController;
