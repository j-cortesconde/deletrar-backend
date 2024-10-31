const express = require('express');
const postRouter = require('./postRoutes');
const userRouter = require('./userRoutes');
const collectionRouter = require('./collectionRoutes');
const commentRouter = require('./commentRoutes');
const conversationRouter = require('./conversationRoutes');
const sharedRouter = require('./sharedRoutes');

const router = express.Router();

router.use('/posts', postRouter);
router.use('/users', userRouter);
router.use('/collections', collectionRouter);
router.use('/comments', commentRouter);
router.use('/conversations', conversationRouter);
router.use('/shareds', sharedRouter);

module.exports = router;
