const AuthController = require('./authController');
const ConversationController = require('./conversationController');

class IoController {
  #io;

  #authController = new AuthController();

  #conversationController = new ConversationController();

  constructor(io) {
    this.#io = io;
  }

  protect = async (socket, next) => {
    // 1) Get the token
    const { token } = socket.handshake.auth;

    if (!token) {
      return next(new Error('Authentication error. Send a token.'));
    }

    // 2) Get that token's user
    socket.user = await this.#authController.getTokenUser(token);

    // 3) If no user (or error in user retrieval) next an error
    if (!socket.user) {
      return next(new Error('There was an unexpected error'));
    }

    if (socket.user.error) {
      return next(new Error(socket.user.error));
    }

    // 4) If all is okay, continue
    next();
  };

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
      async (conversationId, addresseeUsername, newMessage) => {
        await this.#handleSendMessage(
          socket,
          conversationId,
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

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      socket.leave(socket.user.username);
    });
  };

  #handleJoinConversation = async (socket, conversationId) => {
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
  };

  #handleLeaveConversation = (socket, conversationId) => {
    socket.leave(conversationId);
    // console.log(
    //   `User ${socket.user.username} left conversation ${conversationId}`,
    // );
  };

  #handleSendMessage = async (
    socket,
    conversationId,
    addresseeUsername,
    newMessage,
  ) => {
    if (conversationId) {
      // TODO: These two first steps might be redundant
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
      socket.to(conversationId).emit('newConversationMessage', newMessage);

      // Communicate to the addresse that a message has been sent
      socket.to(addresseeUsername).emit('newUserMessage');
    }
  };

  // TODO: Could add to notify user of typing (not only conversation) but not MVP
  #handleTyping = async (socket, conversationId) => {
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
  };

  // TODO: Could add to notify user of typing (not only conversation) but not MVP
  #handleStopTyping = async (socket, conversationId) => {
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
  };
}

module.exports = IoController;
