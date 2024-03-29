//TODO: Still missing routes for a bunch of the auth methods and still missing an auth method for requesting account invitation (to admins or to a known user)
const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/invite', authController.protect, authController.invite);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router
  .route('/')
  .get(userController.getAllUsers)
  //TODO: MAKE SURE this is only possible for specific users as per app's requirements
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUserById)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
