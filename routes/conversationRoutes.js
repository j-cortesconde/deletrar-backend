const express = require('express');

const AuthController = require('../controllers/authController');
const ConversationController = require('../controllers/conversationController');

const router = express.Router();
const conversationController = new ConversationController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router
  .get('/getOwn', conversationController.getOwnConversations)
  .get(
    '/with/:addresseeUsername',
    conversationController.getConversationByAddresseeUsername,
  )
  .patch(
    '/sendMessage/user/:addresseeUsername',
    conversationController.sendMessage,
  )
  // TODO: Seems to be no need for this. Conversations are created by sending a first message
  .post('/user/:addresseeUsername', conversationController.createConversation);

// TODO: Not needed at the moment
// // Make the following routes accessible only to admins:
// router.use(authController.restrictTo('admin'));

module.exports = router;
