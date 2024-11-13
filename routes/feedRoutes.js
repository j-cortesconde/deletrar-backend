const express = require('express');

const FeedController = require('../controllers/feedController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const feedController = new FeedController();
const authController = new AuthController();

router.use(authController.getLoggedInUser);

router.get('/', feedController.getFeed);

module.exports = router;
