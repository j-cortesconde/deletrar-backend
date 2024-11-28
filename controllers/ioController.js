const catchAsync = require('../utils/catchAsync');
const AuthController = require('./authController');
const ConversationController = require('./conversationController');

class IoController {
  #io;

  #authController = new AuthController();

  #conversationController = new ConversationController();

  constructor(io) {
    this.#io = io;
  }

  protect = catchAsync(async (socket, next) => {
    // 1) Get the token
    const { token } = socket.handshake.auth;

    if (!token) {
      return next(new Error('Por favor iniciá sesión.'));
    }

    // 2) Get that token's user
    socket.user = await this.#authController.getTokenUser(token);

    // 3) If no user (or error in user retrieval) next an error
    if (!socket.user) {
      return next(
        new Error(
          'Hubo un error inesperado. Volvé a intentarlo más tarde o comunicate con un administrador.',
        ),
      );
    }

    if (socket.user.error) {
      return next(new Error(socket.user.error));
    }

    // 4) If all is okay, continue
    next();
  });

  handleConnection = (socket) => {
    console.log('New client connected:', socket.user.username);

    // Add the socket to activeSockets upon connection
    socket.join(socket.user.username);

    socket.on('joinConversation', async (conversationId) => {
      await this.#handleJoinConversation(socket, conversationId);
    });

    socket.on('leaveConversation', (conversationId) => {
      this.#handleLeaveConversation(socket, conversationId);
    });

    socket.on(
      'sendMessage',
      async (conversation, addresseeUsername, newMessage) => {
        await this.#handleSendMessage(
          socket,
          conversation,
          addresseeUsername,
          newMessage,
        );
      },
    );

    socket.on('typing', async (conversationId) => {
      await this.#handleTyping(socket, conversationId);
    });

    socket.on('stopTyping', async (conversationId) => {
      await this.#handleStopTyping(socket, conversationId);
    });

    socket.on('messageRead', async (conversationId, messageId) => {
      await this.#handleRead(socket, conversationId, messageId);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      socket.leave(socket.user.username);
    });
  };

  #handleJoinConversation = catchAsync(async (socket, conversationId) => {
    // Check if the user is a participant in the conversation
    const isParticipant =
      await this.#conversationController.isUserInConversation(
        socket.user.username,
        conversationId,
      );

    // If not, return an error message
    if (!isParticipant) {
      return socket.emit('error', {
        message: 'You are not allowed to join this conversation',
      });
    }

    // If so, join the conversation room
    socket.join(conversationId);
    // console.log(
    //   `User ${socket.user.username} joined conversation ${conversationId}`,
    // );
  });

  #handleLeaveConversation = (socket, conversationId) => {
    socket.leave(conversationId);
    // console.log(
    //   `User ${socket.user.username} left conversation ${conversationId}`,
    // );
  };

  #handleSendMessage = catchAsync(
    async (socket, conversation, addresseeUsername, newMessage) => {
      if (conversation._id) {
        // TODO: These two first steps might be redundant
        // Check if the user is a participant in the conversation
        const isParticipant =
          await this.#conversationController.isUserInConversation(
            socket.user.username,
            conversation._id,
          );

        // If not, return an error message
        if (!isParticipant) {
          return socket.emit('error', {
            message: 'You are not allowed to join this conversation',
          });
        }

        conversation.lastMessage = newMessage;
        // Communicate through the conversation that a message has been sent
        socket
          .to(conversation._id)
          .emit('newConversationMessage', conversation, newMessage);

        // Communicate to the addresse that a message has been sent
        socket.to(addresseeUsername).emit('newUserMessage', conversation);
      }
    },
  );

  // TODO: Could add to notify user of typing (not only conversation) but not MVP
  #handleTyping = catchAsync(async (socket, conversationId) => {
    if (conversationId) {
      // Check if the user is a participant in the conversation
      const isParticipant =
        await this.#conversationController.isUserInConversation(
          socket.user.username,
          conversationId,
        );

      // If not, return an error message
      if (!isParticipant) {
        return socket.emit('error', {
          message: 'You are not allowed to join this conversation',
        });
      }

      // Communicate through the conversation that a message has been sent
      socket.in(conversationId).emit('typing');
    }
  });

  // TODO: Could add to notify user of typing (not only conversation) but not MVP
  #handleStopTyping = catchAsync(async (socket, conversationId) => {
    if (conversationId) {
      // Check if the user is a participant in the conversation
      const isParticipant =
        await this.#conversationController.isUserInConversation(
          socket.user.username,
          conversationId,
        );

      // If not, return an error message
      if (!isParticipant) {
        return socket.emit('error', {
          message: 'You are not allowed to join this conversation',
        });
      }

      // Communicate through the conversation that a message has been sent
      socket.in(conversationId).emit('stopTyping');
    }
  });

  #handleRead = catchAsync(async (socket, conversationId, messageId) => {
    // Check if the user is a participant in the conversation
    const isParticipant =
      await this.#conversationController.isUserInConversation(
        socket.user.username,
        conversationId,
      );

    // If not, return an error message
    if (!isParticipant) {
      return socket.emit('error', {
        message: 'You are not allowed to join this conversation',
      });
    }

    await this.#conversationController.markAsRead(messageId);

    // Communicate through the conversation that a message has been sent
    socket.in(conversationId).emit('isRead', conversationId, messageId);
  });
}

module.exports = IoController;
