const AppError = require('../utils/appError');
const ConversationService = require('../services/conversationService');

class ConversationController {
  #service = new ConversationService();

  isUserInConversation = async (username, conversationId) => {
    const conversation =
      await this.#service.getConversationById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if the username exists in the participants array
    return conversation.participants.some(
      (participant) => participant.username === username,
    );
  };

  // Function that checks if theres a conversation. If it already exists, returns it, else it creates and returns a new conversation after recieving a request body with keys [addressee, message]
  createConversation = async (req, res, next) => {
    const doc = await this.#service.getConversation({
      participants: { $all: [req.user.username, req.params.addresseeUsername] },
    });

    if (doc) {
      res.status(200).json({
        status: 'success',
        data: doc,
      });
    } else {
      const newConversation = {
        participants: [req.user.username, req.params.addresseeUsername],
        messages: [
          {
            content: req.body.message,
            messenger: req.user.username,
          },
        ],
      };

      const newDoc = await this.#service.createConversation(newConversation);

      const response = {
        conversation: newDoc,
        addressee: req.params.addresseeUsername,
      };

      res.status(200).json({
        status: 'success',
        data: response,
      });
    }
  };

  // Pushes a new message to the messages array of the given id's conversation
  sendMessage = async (req, res, next) => {
    const newMessage = {
      content: req.body.message,
      messenger: req.user.username,
    };

    const oldDoc = await this.#service.getConversation({
      participants: { $all: [req.user.username, req.params.addresseeUsername] },
    });

    if (!oldDoc) {
      return this.createConversation(req, res, next);
    }

    const doc = await this.#service.updateConversation(
      {
        participants: {
          $all: [req.user.username, req.params.addresseeUsername],
        },
      },
      {
        $push: { messages: newMessage },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    const response = {
      conversation: doc,
      addressee: req.params.addresseeUsername,
    };

    res.status(200).json({
      status: 'success',
      data: response,
    });
  };

  getOwnConversations = async (req, res, next) => {
    const matchObject = {
      participants: req.user.username,
    };

    // TODO: Punto de falla
    // const sort = { 'lastMessage.timestamp': -1 };

    const totalDocs = await this.#service.countConversations(matchObject);

    const paginatedDocs = await this.#service.getConversations(
      matchObject,
      null,
      // { sort },
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

  // TODO: Add functionality that will check req.user is participant
  // TODO: Check if this method is even being used
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

  getConversationByAddresseeUsername = async (req, res, next) => {
    const doc = await this.#service.getConversation({
      participants: { $all: [req.user.username, req.params.addresseeUsername] },
    });

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
