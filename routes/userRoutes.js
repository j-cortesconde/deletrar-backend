// TODO: Tidy (same with other routers)
// TODO: @frontend Add a functionality so a user can modify their account settings (and make those account settings impactful elsewhere) (also add them to userModel)
// TODO: Must add an error catch in the error handler that contemplates when in the authController.invite the user tries to invite someone that has already been invited.
const express = require('express');

const UserController = require('../controllers/userController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const userController = new UserController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

router
  .post('/requestInvite', authController.requestInvite)
  .post('/login', authController.login)
  .get('/logout', authController.logout);

router
  .post('/forgotPassword', authController.forgotPassword)
  .patch('/resetPassword/:token', authController.resetPassword);

// FIXME: The getUserByUsername route was "/:username" but it was causing issues since it was before others like "/me", causing getUserByUsername to trigger with the username param set to "me" instead of the getMe being triggered. I changed it now to "/username/:username" but it's uglier. Is there a better way? Find out
// FIXME: Same for all /id/:id (and maybe in postRoute too)
router
  .get('/', userController.getAllUsers)
  .get('/username/:username', userController.getUserByUsername)
  .get('/followers/:username', userController.getFollowers)
  .get('/following/:username', userController.getFollowing)
  .get('/search/:searchTerm', userController.searchUsers);

// Protect all routes from now on:
router.use(authController.protect);

router
  .patch('/initializeMe', userController.initializeMe)
  .get('/me', userController.getMe);

// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);

router.patch('/reactivateMe', userController.reactivateMe);

// Make sure user account is active from now on:
router.use(authController.isActive);

router
  // FIXME: Must change these first two so they dont get ownUsername from request, instead from validating user (and change in frontend)
  .get('/isFollower/:ownUsername/:otherUsername', userController.isFollower)
  .get('/amFollowing/:ownUsername/:otherUsername', userController.amFollowing)
  .get('/haveSaved/post/:postId', userController.haveSavedPost)
  .get(
    '/haveSaved/collection/:collectionId',
    userController.haveSavedCollection,
  )
  // FIXME: Perhaps these should be action/type/id (follow/id/:otherUsername or /save/post/:postId)
  .patch('/id/:otherUsername/follow', userController.followUser)
  .patch('/id/:otherUsername/unfollow', userController.unfollowUser)
  .patch('/post/:postId/save', userController.savePost)
  .patch('/post/:postId/unsave', userController.unsavePost)
  .patch('/collection/:collectionId/save', userController.saveCollection)
  .patch('/collection/:collectionId/unsave', userController.unsaveCollection);

router
  .post('/invite', authController.invite)
  .patch('/updateMyPassword', authController.updatePassword)
  .patch(
    '/updateMe',
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateMe,
  )
  .delete('/deleteMe', userController.deleteMe);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.post('/', userController.createUser);
router
  .route('/id/:username')
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
