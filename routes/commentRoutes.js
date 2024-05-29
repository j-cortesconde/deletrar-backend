// TODO: Add functionality to like a comment
const express = require('express');

const CommentController = require('../controllers/commentController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const commentController = new CommentController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

router
  .get('/post/:postId', commentController.getCommentsByPostId)
  .get('/collection/:collectionId', commentController.getCommentsByCollectionId)
  .get('/replies/:commentId', commentController.getCommentsByRepliedCommentId)
  .get('/id/:id', commentController.getCommentById)
  .post('/', commentController.createComment);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router.patch('/id/:id', commentController.updateComment);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/id/:id', commentController.adminDeleteComment);

module.exports = router;
