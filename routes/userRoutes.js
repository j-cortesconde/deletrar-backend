// TODO: Adding public user search features that are app safe
// TODO: Must add a way of changing a user's email (with password prompting and email confirmation) (in /updateMe)
// TODO: Add a functionality so a user can modify their account settings (and make those account settings impactful elsewhere) (also add them to userModel)
// TODO: Still missing an auth method for requesting account invitation (to admins or to a known user)
// TODO: Must add an error catch in the error handler that contemplates when in the authController.invite the user tries to invite someone that has already been invited.
const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/requestAccount', authController.requestAccount);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes from now on:
router.use(authController.protect);

router.patch('/initializeMe', userController.initializeMe);

// Make sure user account is initialized (isnt invitee)
router.use(authController.isInitialized);

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
