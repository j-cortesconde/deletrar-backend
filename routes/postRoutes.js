// TODO: Add functionality to like and favorite a post (sharing will be in feed)
// TODO: I commented out the route for .getAllPosts. Check if should add again
const express = require('express');

const PostController = require('../controllers/postController');
const AuthController = require('../controllers/authController');
const UploadController = require('../controllers/uploadController');

const router = express.Router();
const postController = new PostController();
const authController = new AuthController();
const uploadController = new UploadController();

router.use(authController.getLoggedInUser);

router.get('/images', postController.createImages);
router.get('/seed', postController.createMockPosts);

router
  .get('/', postController.getAllPosts)
  .get('/user/:username', postController.getPostsByAuthorUsername)
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
  .get('/ownHidden', postController.getOwnHidenPosts)
  .post(
    '/',
    uploadController.multerImageUpload,
    uploadController.uploadCoverImage,
    postController.createPost,
  )
  .patch(
    '/id/:id',
    uploadController.multerImageUpload,
    uploadController.uploadCoverImage,
    postController.updatePost,
  );

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/id/:id', postController.adminDeletePost);

module.exports = router;
