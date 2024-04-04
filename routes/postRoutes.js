const express = require('express');

const postController = require('../controllers/postController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .get('/', postController.getAllPosts)
  .get('/:id', postController.getPostById);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router
  .post('/', postController.setAuthor, postController.createPost)
  .patch('/:id', postController.updatePost)
  .get('/:id/old/:version?', postController.getPreviousVersion);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/:id', postController.deletePost);

module.exports = router;
