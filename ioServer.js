const { Server } = require('socket.io');
const server = require('./server');

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});

io.on('connection', (socket) => {
  // console.log(`Socket connected ${socket.id}`);

  // TODO: This should have auth so only authenticated user con join.(username) (or better yet, get the username from auth)
  socket.on('setup', (username) => {
    socket.join(username);
    // console.log(`${username} connected`);
    // TODO: Pareciera ser innecesario. Borrar si en las pruebas se demuestra que lo es
    // socket.emit('connected');
  });

  // TODO: This (and the following) should have auth so only authenticated participants can join/emit to conversationId
  socket.on('join-conversation', (conversationId) => {
    // console.log(`${conversationId} joined`);
    socket.join(conversationId);
  });

  socket.on('typing', (conversationId) =>
    socket.in(conversationId).emit('typing'),
  );
  socket.on('stop-typing', (conversationId) =>
    socket.in(conversationId).emit('stop-typing'),
  );

  socket.on('message-sent', ({ addressee, newMessage }) => {
    socket.in(newMessage.conversationId).emit('message-recieved', newMessage);
    socket.in(addressee).emit('new-message');
  });

  socket.on('leave-conversation', (conversationId) => {
    // console.log(`${conversationId} left`);
    socket.leave(conversationId);
  });

  // TODO: Parece ser innecesario. Ver en pruebas
  // socket.on('disconnect', (username) => {
  //   // console.log('Socket disconnected');
  //   socket.leave(username);
  // });
});
