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
  .get('/id/:conversationId', conversationController.getConversationById)
  .patch(
    '/sendMessage/user/:addresseeUsername',
    conversationController.sendMessage,
  )
  .post('/user/:addresseeUsername', conversationController.createConversation);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

router.delete('/id/:id', conversationController.adminDeleteConversation);

module.exports = router;
