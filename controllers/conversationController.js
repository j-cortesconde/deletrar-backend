const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');

class ConversationController {
  #ConversationService = new ConversationService();

  #MessageService = new MessageService();

  isUserInConversation = async (username, conversationId) => {
    const conversation =
      await this.#ConversationService.getConversationById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if the username exists in the participants array
    return conversation.participants.some(
      (participant) => participant.username === username,
    );
  };

  // Function that checks if theres a conversation. If it already exists, creates a new message for it and returns it, else it creates and returns a new conversation after recieving a request body with key [message]
  createConversation = async (req, res, next) => {
    if (req.params.addresseeUsername === req.user.username) {
      return res.status(400).json({
        status: 'fail',
        message: 'No se puede iniciar una conversación consigo mismo.',
      });
    }

    if (!req.body.message) {
      return res.status(400).json({
        status: 'fail',
        message: 'La solicitud debe incluir un mensaje.',
      });
    }
    const postedMessage = {
      content: req.body.message,
      messenger: req.user.username,
    };

    const existingConversation =
      await this.#ConversationService.getConversation({
        participants: {
          $all: [req.user.username, req.params.addresseeUsername],
        },
      });

    if (existingConversation) {
      postedMessage.conversation = existingConversation._id;

      await this.#MessageService.createMessage(postedMessage);

      const messages = await this.#MessageService.getMessages(
        {
          conversation: existingConversation._id,
        },
        null,
        req.query,
      );

      const response = {
        conversation: existingConversation,
        /// Doing this reverse here since the service didn't seem to allow for a chain of conflicting sorts
        messages: messages.reverse(),
      };

      res.status(200).json({
        status: 'success',
        data: response,
      });
    } else {
      const postedConversation = {
        participants: [req.user.username, req.params.addresseeUsername],
      };
      const newConversation =
        await this.#ConversationService.createConversation(postedConversation);

      postedMessage.conversation = newConversation._id;
      const newMessage =
        await this.#MessageService.createMessage(postedMessage);

      const response = {
        conversation: newConversation,
        messages: [newMessage],
        addressee: req.params.addresseeUsername,
      };

      res.status(200).json({
        status: 'success',
        data: response,
      });
    }
  };

  // Creates a new message for a conversation
  sendMessage = async (req, res, next) => {
    if (req.params.addresseeUsername === req.user.username) {
      return res.status(400).json({
        status: 'fail',
        message: 'No se puede enviar un mensaje a sí mismo.',
      });
    }

    if (!req.body.message) {
      return res.status(400).json({
        status: 'fail',
        message: 'La solicitud debe incluir un mensaje.',
      });
    }

    const postedMessage = {
      content: req.body.message,
      messenger: req.user.username,
    };

    const existingConversation =
      await this.#ConversationService.getConversation({
        participants: {
          $all: [req.user.username, req.params.addresseeUsername],
        },
      });

    if (!existingConversation) {
      return this.createConversation(req, res, next);
    }
    postedMessage.conversation = existingConversation._id;

    await this.#MessageService.createMessage(postedMessage);
    const messages = await this.#MessageService.getMessages(
      {
        conversation: existingConversation._id,
      },
      null,
      req.query,
    );

    const response = {
      conversation: existingConversation,
      addressee: req.params.addresseeUsername,
      /// Doing this reverse here since the service didn't seem to allow for a chain of conflicting sorts
      messages: messages.reverse(),
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

    const data = await this.#ConversationService.getConversations(
      matchObject,
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  };

  getConversationByAddresseeUsername = async (req, res, next) => {
    if (req.params.addresseeUsername === req.user.username) {
      return res.status(400).json({
        status: 'fail',
        message: 'No se puede tener una conversación consigo mismo.',
      });
    }

    const conversation = await this.#ConversationService.getConversation(
      {
        participants: {
          $all: [req.user.username, req.params.addresseeUsername],
        },
      },
      { populate: 'lastMessage' },
    );

    if (!conversation) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ninguna conversación con ese usuario.',
      });
    }

    // Makes so if the requester isn't who sent the last message then the message will be marked as read:true
    if (conversation.lastMessage?.messenger !== req.user.username) {
      const updatedLastMessage = await this.#MessageService.updateMessage(
        {
          _id: conversation.lastMessage._id,
        },
        { read: true },
        { new: true },
      );

      conversation.lastMessage = updatedLastMessage;
    }

    const messages = await this.#MessageService.getMessages(
      {
        conversation: conversation._id,
      },
      null,
      req.query,
    );

    const response = {
      conversation,
      /// Doing this reverse here since the service didn't seem to allow for a chain of conflicting sorts
      messages: messages.reverse(),
    };

    res.status(200).json({
      status: 'success',
      data: response,
    });
  };
}

module.exports = ConversationController;
