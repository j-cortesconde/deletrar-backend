const express = require('express');
const postRouter = require('./postRoutes');
const userRouter = require('./userRoutes');

const router = express.Router();

router.use('/posts', postRouter);
router.use('/users', userRouter);

module.exports = router;
