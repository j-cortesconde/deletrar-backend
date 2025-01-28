//TODO: Missing FEED, MESSAGE, COLLECTION, COMMENT(this will require nested route on post and on collection)
//TODO: Missing report (security) features
//TODO: Missing a global error handler
//TODO: @frontend: Email url constants (xxxxURL) should be adapted
// FIXME: I npm i cors and use it here. See if i have to delete (and uninstall it) or not
//TODO: See CDN for images
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { createServer } = require('http');
const socketIo = require('socket.io');

const indexRouter = require(`./routes/index`);
const AppError = require('./utils/appError');
const IoController = require('./controllers/ioController');
const ErrorController = require('./controllers/errorController');

const app = express();
const httpServer = createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: '*',
  },
});

const ioController = new IoController(io);
const errorController = new ErrorController();

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use('/api/v1', indexRouter);

io.use(ioController.protect);
io.on('connection', ioController.handleConnection);

app.all('*', (req, res, next) => {
  next(
    new AppError(
      `La acción no se pudo llevar a cabo por un problema de rutas. Por favor comunicate con un administrador.`,
      404,
    ),
  );
});

app.use(errorController.globalErrorHandler);

module.exports = httpServer;
