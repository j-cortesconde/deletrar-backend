// TODO: Adding public user search features that are app safe
// TODO: @frontend Add a functionality so a user can modify their account settings (and make those account settings impactful elsewhere) (also add them to userModel)
// TODO: Must add an error catch in the error handler that contemplates when in the authController.invite the user tries to invite someone that has already been invited.
const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/requestInvite', authController.requestInvite);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes from now on:
router.use(authController.protect);

router.patch('/initializeMe', userController.initializeMe);

// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);

router.get('/reactivateMe', userController.reactivateMe);

// Make sure user account is active from now on:
router.use(authController.isActive);

router.post('/invite', authController.invite);
router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUserById);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUserById)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
