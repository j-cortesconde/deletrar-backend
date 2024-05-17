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

router.post('/requestInvite', authController.requestInvite);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// FIXME: The getUserByUsername route was "/:username" but it was causing issues since it was before others like "/me", causing getUserByUsername to trigger with the username param set to "me" instead of the getMe being triggered. I changed it now to "/username/:username" but it's uglier. Is there a better way? Find out
// FIXME: Same for all /id/:id (and maybe in postRoute too)
router.get('/', userController.getAllUsers);
router.get('/username/:username', userController.getUserByUsername);
router.get('/followers/:username', userController.getFollowers);
router.get('/following/:username', userController.getFollowing);
router.get('/search/:searchTerm', userController.searchUsers);

// Protect all routes from now on:
router.use(authController.protect);

router.patch('/initializeMe', userController.initializeMe);
router.get('/me', userController.getMe);

// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);

router.patch('/reactivateMe', userController.reactivateMe);

// Make sure user account is active from now on:
router.use(authController.isActive);

router.get(
  '/isFollower/:ownUsername/:otherUsername',
  userController.isFollower,
);
router.get(
  '/amFollowing/:ownUsername/:otherUsername',
  userController.amFollowing,
);
router.patch('/id/:otherUsername/follow', userController.followUser);
router.patch('/id/:otherUsername/unfollow', userController.unfollowUser);

router.post('/invite', authController.invite);
router.patch('/updateMyPassword', authController.updatePassword);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.post('/', userController.createUser);
router
  .route('/id/:username')
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
