// TODO: Add functionality to like and favorite a collection (sharing will be in feed)
const express = require('express');

const AuthController = require('../controllers/authController');
const CollectionController = require('../controllers/collectionController');
const UploadController = require('../controllers/uploadController');

const router = express.Router();
const authController = new AuthController();
const collectionController = new CollectionController();
const uploadController = new UploadController();

router.use(authController.getLoggedInUser);

router
  .get('/', collectionController.getAllCollections)
  .get(
    '/user/:username',
    collectionController.getCollectionsByCollectorUsername,
  )
  .get('/id/:id', collectionController.getCollectionById)
  .get('/search/:searchTerm', collectionController.searchCollections);

// Protect all routes from now on:
router.use(authController.protect);
// Make sure user account is initialized (isnt invitee) from now on:
router.use(authController.isInitialized);
// Make sure user account is active from now on:
router.use(authController.isActive);

router
  .get('/ownHidden', collectionController.getOwnHiddenCollections)
  .post(
    '/',
    uploadController.multerImageUpload,
    uploadController.uploadCoverImage,
    collectionController.createCollection,
  )
  .patch(
    '/id/:id',
    uploadController.multerImageUpload,
    uploadController.uploadCoverImage,
    collectionController.updateCollection,
  )
  .patch('/id/:id/addPost', collectionController.addPost)
  .patch('/id/:id/removePost', collectionController.removePost)
  .patch('/id/:id/movePost', collectionController.movePost);

// Make the following routes accessible only to admins:
router.use(authController.restrictTo('admin'));

// router.get('/seed', collectionController.createMockCollections);
router.delete('/id/:id', collectionController.adminDeleteCollection);

module.exports = router;
