const AuthController = require('./authController');
const ConversationController = require('./conversationController');

class IoController {
  #io;

  // Map to store active sockets associated with usernames
  #activeSockets = new Map();

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
    this.#activeSockets.set(socket.user.username, socket);

    socket.on('joinConversation', async (conversationId) => {
      await this.#handleJoinConversation(socket, conversationId);
    });

    socket.on('leaveConversation', (conversationId) => {
      this.#handleLeaveConversation(socket, conversationId);
    });

    // socket.on('sendMessage', async (conversationId, messageContent) => {
    //   await this.#handleSendMessage(socket, conversationId, messageContent);
    // });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      // Remove the socket from activeSockets upon disconnect
      this.#activeSockets.delete(socket.user.username);
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
    console.log(
      `User ${socket.user.username} joined conversation ${conversationId}`,
    );
  };

  #handleLeaveConversation = (socket, conversationId) => {
    socket.leave(conversationId);
    console.log(
      `User ${socket.user.username} left conversation ${conversationId}`,
    );
  };
}

module.exports = IoController;
