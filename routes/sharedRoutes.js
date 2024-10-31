// TODO: Add functionality to like a comment
const express = require('express');

const SharedController = require('../controllers/sharedController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const sharedController = new SharedController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

router
  //TODO: Should this route exist?
  .get('/', sharedController.getAllShareds)
  .get('/post/:postId', sharedController.getSharedsByPostId)
  .get('/collection/:collectionId', sharedController.getSharedsByCollectionId)
  .get('/comment/:commentId', sharedController.getSharedsByCommentId)
  .get('/id/:id', sharedController.getSharedById);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router
  .post('/', sharedController.createShared)
  .patch('/id/:id', sharedController.updateShared);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/id/:id', sharedController.adminDeleteShared);

module.exports = router;
