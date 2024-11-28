const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');
const catchAsync = require('../utils/catchAsync');

class ConversationController {
  #ConversationService = new ConversationService();

  #MessageService = new MessageService();

  isUserInConversation = async (username, conversationId) => {
    const conversation =
      await this.#ConversationService.getConversationById(conversationId);

    if (!conversation) {
      throw new Error('No se encontró esa conversación.');
    }

    // Check if the username exists in the participants array
    return conversation.participants.some(
      (participant) => participant.username === username,
    );
  };

  markAsRead = async (messageId) => {
    const message = await this.#MessageService.updateMessage(
      { _id: messageId },
      { read: true },
      { new: true },
    );

    if (!message) throw new Error('No se encontró ese mensaje.');

    return message;
  };

  // Function that checks if theres a conversation. If it already exists, creates a new message for it and returns it, else it creates and returns a new conversation after recieving a request body with key [message]
  #createConversation = async (req, res, next) => {
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

    // TODO: For a public createConversation, this would be necessary. Since this is private only to be used by sendMessage when no conversation is found, this is unnecessary and inconvenient

    // const existingConversation =
    //   await this.#ConversationService.getConversation({
    //     participants: {
    //       $all: [req.user.username, req.params.addresseeUsername],
    //     },
    //   });

    // if (existingConversation) {
    //   postedMessage.conversation = existingConversation._id;

    //   const newMessage =
    //     await this.#MessageService.createMessage(postedMessage);

    //   // const messages = await this.#MessageService.getMessages(
    //   //   {
    //   //     conversation: existingConversation._id,
    //   //   },
    //   //   req.query,
    //   // );

    //   const response = {
    //     conversation: existingConversation,
    //     addressee: req.params.addresseeUsername,
    //     newMessage,
    //     /// Doing this reverse here since the service didn't seem to allow for a chain of conflicting sorts
    //     messages: messages.reverse(),
    //   };

    //   res.status(200).json({
    //     status: 'success',
    //     data: response,
    //   });
    // } else {
    const postedConversation = {
      participants: [req.user.username, req.params.addresseeUsername],
    };
    const newConversation =
      await this.#ConversationService.createConversation(postedConversation);

    postedMessage.conversation = newConversation._id;
    const newMessage = await this.#MessageService.createMessage(postedMessage);

    const existingConversation =
      await this.#ConversationService.getConversation({
        _id: newConversation._id,
      });

    const response = {
      conversation: existingConversation,
      messages: [newMessage],
      newMessage,
      addressee: req.params.addresseeUsername,
    };

    res.status(200).json({
      status: 'success',
      data: response,
    });
  };
  // };

  // Creates a new message for a conversation
  sendMessage = catchAsync(async (req, res, next) => {
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
      return this.#createConversation(req, res, next);
    }
    postedMessage.conversation = existingConversation._id;

    const newMessage = await this.#MessageService.createMessage(postedMessage);

    const response = {
      conversation: existingConversation,
      addressee: req.params.addresseeUsername,
      newMessage,
    };

    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  getOwnConversations = catchAsync(async (req, res, next) => {
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
  });

  getConversationByAddresseeUsername = catchAsync(async (req, res, next) => {
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

    // TODO: No habría que cambiar esto por una respuesta vacía en vez de un error?
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

    const { limitedDocuments, totalCount, hasNextPage, nextPage } =
      await this.#MessageService.getMessages(
        {
          conversation: conversation._id,
        },
        req.query,
      );

    const response = {
      conversation,
      totalCount,
      hasNextPage,
      nextPage,
      // TODO: Since this service is now an aggregation pipeline instead of a query, this might be avoidable
      /// Doing this reverse here since the service didn't seem to allow for a chain of conflicting sorts
      messages: limitedDocuments.reverse(),
    };

    res.status(200).json({
      status: 'success',
      data: response,
    });
  });
}

module.exports = ConversationController;
