//TODO: Missing a global error handler
const express = require('express');
const morgan = require('morgan');

const postRouter = require(`./routes/postRoutes`);

const app = express();

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

app.use('/api/v1/posts', postRouter);

app.all('*', (req, res, next) => {
  console.log('Error');
  res.send('Not today boy');
});

module.exports = app;
