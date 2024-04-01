//TODO: Still missing routes for a bunch of the auth methods and still missing an auth method for requesting account invitation (to admins or to a known user)
const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// TODO:No signup, but yes signup request here
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// TODO: Must think about and add public user search features. They must be safe.

// Protect all routes from now on:
router.use(authController.protect);

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
//TODO: Add a functionality so a user can modify their account settings (and make those account settings impactful elsewhere)

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
