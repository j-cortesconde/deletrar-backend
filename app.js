//TODO: Missing FEED, MESSAGE, COLLECTION, COMMENT(this will require nested route on post and on collection)
//TODO: Missing report (security) features
//TODO: Missing a global error handler
//TODO: @frontend: Email url constants (xxxxURL) should be adapted
const express = require('express');
const morgan = require('morgan');

const postRouter = require(`./routes/postRoutes`);
const userRouter = require(`./routes/userRoutes`);

const app = express();

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);

//FIXME:This must be fixed
app.all('*', (req, res, next) => {
  console.log('Error');
  res.send('Not today boy');
});

module.exports = app;
