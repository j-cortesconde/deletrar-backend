// TODO: Add functionality to like and favorite a post (sharing will be in feed)
// TODO: I commented out the route for .getAllPosts. Check if should add again
const express = require('express');

const PostController = require('../controllers/postController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const postController = new PostController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

router
  // .get('/', postController.getAllPosts)
  .get('/id/:id', postController.getPostById)
  .get('/id/:id/old/:version?', postController.getPreviousVersion)
  .get('/search/:searchTerm', postController.searchPosts);

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
    '/id/:id',
    postController.uploadPostImage,
    postController.resizePostImage,
    postController.updatePost,
  );

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/id/:id', postController.adminDeletePost);

module.exports = router;
