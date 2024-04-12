// TODO: Add functionality to like and favorite a post (sharing will be in feed)
const express = require('express');

const PostController = require('../controllers/postController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const postController = new PostController();
const authController = new AuthController();

router
  .get('/', postController.getAllPosts)
  .get('/:id', postController.getPostById)
  .get('/:id/old/:version?', postController.getPreviousVersion)
  .post('/:searchTerm', postController.searchPosts);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router
  .post(
    '/',
    postController.uploadPostImage,
    postController.resizePostImage,
    postController.createPost,
  )
  .patch(
    '/:id',
    postController.uploadPostImage,
    postController.resizePostImage,
    postController.updatePost,
  );

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/:id', postController.deletePost);

module.exports = router;
