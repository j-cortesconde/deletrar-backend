const socketIo = require('socket.io');
const httpServer = require('./app');
const IoController = require('./controllers/ioController');

const io = socketIo(httpServer);
const ioController = new IoController(io);

io.use(ioController.protect);

io.on('connection', ioController.handleConnection);

module.exports = io;
