// FIXME: I removed the catchAsync function from all methods that call services. Should add again somehow
const filterObj = require('../utils/filterObj');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const UserService = require('../services/userService');
const PostService = require('../services/postService');
const CollectionService = require('../services/collectionService');
const SharedService = require('../services/sharedService');
const CommentService = require('../services/commentService');

class UserController {
  #UserService = new UserService();

  #PostService = new PostService();

  #CollectionService = new CollectionService();

  #SharedService = new SharedService();

  #CommentService = new CommentService();

  // Makes sure the user submitted a currentPassword and checks it's correct
  #checkPassword = async (req) => {
    // 1.1) Demands currentPassword
    if (!req.body.currentPassword)
      throw new AppError(
        'Tenés que informar tu contraseña actual antes de poder seguir adelante.',
        401,
      );

    const user = await this.#UserService.getUserById(req.user.id);

    if (
      !(await this.#UserService.isPasswordCorrect(
        user,
        req.body.currentPassword,
      ))
    ) {
      // 1.3) Check if POSTed currentPassword is correct. If so, continues, else it errors
      throw new AppError('La contraseña que ingresaste es incorrecta.', 401);
    }
  };

  // Returns the logged in users' information
  // FIXME: This is duplicating getUserById code. PosSol: Pass (req.params.id || req.user.id) into .getUserById()
  // TODO: Update. It shouldnt be duplicating. Now it gets different info for frontend route protection (like inactive, state and role)
  getMe = catchAsync(async (req, res, next) => {
    if (!req?.user?.id) {
      // return next(new AppError("User isn't logged in", 500));
      return res.status(200).json({
        status: 'success',
        data: null,
      });
    }

    const select =
      'name username email photo description createdAt role settings active';

    const doc = await this.#UserService.getUserById(req.user.id, {
      select,
      includeInactive: true,
    });

    if (!doc) {
      return next(new AppError('No se encontró a ese usuario.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  // Updates currently loggedin user's information. Excludes password info and all info that isn't allowed to update this way (also allows to update photo path)
  updateMe = catchAsync(async (req, res, next) => {
    // 0) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        // TODO: Inform which is the correct section
        new AppError(
          'Esta no es la forma en que se debe modificar la contraseña. Por favor dirigite a la sección correspondiente.',
          400,
        ),
      );
    }

    // 1) Demands and checks currentPassword if user is trying to update the email address
    if (req.body.email) {
      try {
        await this.#checkPassword(req);
      } catch (error) {
        return next(error);
      }
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'description', 'email');
    const { publicAccount, publicEditing, receivingInvitationRequests } =
      req.body;

    filteredBody.settings = {
      publicAccount,
      publicEditing,
      receivingInvitationRequests,
    };

    if (req.file) filteredBody.photo = req.file.filename;

    // 3) Update user document
    const updatedUser = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $set: filteredBody },
      {
        new: true,
        runValidators: true,
        fields: {
          _id: 1,
          name: 1,
          username: 1,
          email: 1,
          photo: 1,
          role: 1,
          active: 1,
          createdAt: 1,
          description: 1,
          followerAmount: 1,
          settings: 1,
        },
      },
    );

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  });

  // Initializes the user (adds custom username and changes role from invitee to user)
  initializeMe = catchAsync(async (req, res, next) => {
    // 1) Make sure the request includes a username and the user isn't initiated (is invitee)
    if (!req.body.username)
      return res.status(401).json({
        status: 'fail',
        message: 'Se debe informar un nombre de usuario',
      });
    if (req.user.role !== 'invitee')
      return res.status(401).json({
        status: 'fail',
        message: 'La cuenta del usuario ya fue activada',
      });

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'username');
    filteredBody.role = 'user';

    // 3) Update user document
    const select =
      'name username email photo description createdAt role settings active';

    const updatedUser = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $set: filteredBody },
      { select, new: true, runValidators: true },
    );

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  });

  // Finds the document for the current logged in user and sets it 'active' property to false, effectively disabling it.
  deleteMe = catchAsync(async (req, res, next) => {
    try {
      await this.#checkPassword(req);
    } catch (error) {
      return next(error);
    }

    await this.#UserService.updateUser(
      { _id: req.user.id },
      { $set: { active: false } },
    );

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  // Finds the document for the current logged in user and sets it 'active' property to true, effectively reenabling it.
  reactivateMe = catchAsync(async (req, res, next) => {
    const select =
      'name username email photo description createdAt role settings active';

    const user = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $set: { active: true } },
      { select, new: true, includeInactive: true },
    );

    await this.#CollectionService.updateCollections(
      { collector: req.user.username, status: 'inactive' },
      { status: 'posted' },
    );

    await this.#PostService.updatePosts(
      { author: req.user.username, status: 'inactive' },
      { status: 'posted' },
    );

    await this.#SharedService.updateShareds(
      { sharer: req.user.username, status: 'inactive' },
      { status: 'posted' },
    );

    await this.#CommentService.updateComments(
      { author: req.user.username, status: 'inactive' },
      { status: 'posted' },
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  });

  // Finds the document for the current logged in user and sets it 'active' property to true, effectively disabling it.
  deactivateMe = catchAsync(async (req, res, next) => {
    await this.#UserService.updateUser(
      { _id: req.user.id },
      { $set: { active: false } },
    );

    await this.#CollectionService.updateCollections(
      { collector: req.user.username, status: 'posted' },
      { status: 'inactive' },
    );

    await this.#PostService.updatePosts(
      { author: req.user.username, status: 'posted' },
      { status: 'inactive' },
    );

    await this.#SharedService.updateShareds(
      { sharer: req.user.username, status: 'posted' },
      { status: 'inactive' },
    );

    await this.#CommentService.updateComments(
      { author: req.user.username, status: 'posted' },
      { status: 'inactive' },
    );

    res.status(200).json({
      status: 'success',
    });
  });

  getAllUsers = catchAsync(async (req, res, next) => {
    const doc = await this.#UserService.getAllUsers(
      req.query,
      'name username email photo description createdAt',
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: doc,
    });
  });

  getUserByUsername = catchAsync(async (req, res, next) => {
    const select =
      'name username email photo description followerAmount createdAt';
    const doc = await this.#UserService.getUser(
      { username: req.params.username },
      {
        select,
      },
    );

    if (!doc) {
      return next(new AppError('No se encontró a ese usuario.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  createUser = catchAsync(async (req, res, next) => {
    const doc = await this.#UserService.createUser(req.body);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  });

  // Shouldn't be used for password updating.
  updateUser = catchAsync(async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { username: req.params.username },
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!doc) {
      return next(new AppError('No se encontró a ese usuario.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  deleteUser = catchAsync(async (req, res, next) => {
    const doc = await this.#UserService.deleteUser(req.params.username);

    if (!doc) {
      return next(new AppError('No se encontró a ese usuario.', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  followUser = catchAsync(async (req, res, next) => {
    await this.#UserService.updateUser(
      { _id: req.user.id },
      {
        $push: {
          following: { $each: [req.params.otherUsername], $position: 0 },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    const otherUser = await this.#UserService.updateUser(
      { username: req.params.otherUsername },
      {
        $push: { followers: { $each: [req.user.username], $position: 0 } },
        $inc: { followerAmount: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { otherUsername: otherUser.username },
    });
  });

  unfollowUser = catchAsync(async (req, res, next) => {
    await this.#UserService.updateUser(
      { _id: req.user.id },
      { $pull: { following: req.params.otherUsername } },
      {
        new: true,
        runValidators: true,
      },
    );

    const otherUser = await this.#UserService.updateUser(
      { username: req.params.otherUsername },
      { $pull: { followers: req.user.username }, $inc: { followerAmount: -1 } },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { otherUsername: otherUser.username },
    });
  });

  searchUsers = catchAsync(async (req, res, next) => {
    const docs = await this.#UserService.searchUsers(req.params.searchTerm);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  });

  // FIXME: HAVE TO CHANGE THIS as i said below
  // TODO: The following/follower model isnt ideal. The way it is now, there is a way to order by oldest/latest followed user (the users one follows) but not by oldest/latest following user (the users that follow one). Better solution is out there
  // TODO: Expanding on this. If you add a followers array field to the user schema and each time a user follows another one the followed username gets unshifted into the following array field of the follower document and the follower username gets unshifted into the followers array field of the followed user, then both the following and the followers arrays become ordered from latest first to oldest last. If this is done so, the getFollowers service should be changed for something that resembles the current state of the getFollowing one (a common service could even be created that just gets passed in the name of the field queried, following/followers)
  getFollowers = catchAsync(async (req, res, next) => {
    const data = await this.#UserService.getFollowingOrFollowers(
      'followers',
      req.params.username,
      req.query,
    );

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.followers,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  getFollowing = catchAsync(async (req, res, next) => {
    const data = await this.#UserService.getFollowingOrFollowers(
      'following',
      req.params.username,
      req.query,
    );

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.following,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  isFollower = catchAsync(async (req, res, next) => {
    const select = 'username';

    const doc = await this.#UserService.getUser(
      {
        _id: req.user.id,
        followers: req.params.otherUsername,
      },
      { select },
    );

    const isFollower = !!doc;

    res.status(200).json({
      status: 'success',
      data: isFollower,
    });
  });

  amFollowing = catchAsync(async (req, res, next) => {
    const select = 'username';

    const doc = await this.#UserService.getUser(
      {
        _id: req.user.id,
        following: req.params.otherUsername,
      },
      { select },
    );

    const amFollowing = !!doc;

    res.status(200).json({
      status: 'success',
      data: amFollowing,
    });
  });

  savePost = catchAsync(async (req, res, next) => {
    const docId = req.params.postId;
    const docType = 'post';
    const operation = 'save';

    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      {
        $push: {
          savedPosts: { $each: [docId], $position: 0 },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      // TODO: See if ownUser must remain
      data: { ownUser: doc, docId, docType, operation },
    });
  });

  unsavePost = catchAsync(async (req, res, next) => {
    const docId = req.params.postId;
    const docType = 'post';
    const operation = 'unsave';

    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $pull: { savedPosts: docId } },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { ownUser: doc, docId, docType, operation },
    });
  });

  haveSavedPost = catchAsync(async (req, res, next) => {
    const select = 'username';

    const doc = await this.#UserService.getUser(
      {
        _id: req.user.id,
        savedPosts: req.params.postId,
      },
      { select },
    );

    const haveSaved = !!doc;

    res.status(200).json({
      status: 'success',
      data: haveSaved,
    });
  });

  getSavedPosts = catchAsync(async (req, res, next) => {
    const data = await this.#UserService.getSavedPosts(
      req.params.username,
      req.query,
    );
    if (!data) return next(new AppError('No se encontró a ese usuario.', 404));

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.savedPosts,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  saveCollection = catchAsync(async (req, res, next) => {
    const docId = req.params.collectionId;
    const docType = 'collection';
    const operation = 'save';

    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      {
        $push: {
          savedCollections: { $each: [docId], $position: 0 },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      // TODO: See if ownUser must remain
      data: { ownUser: doc, docId, docType, operation },
    });
  });

  unsaveCollection = catchAsync(async (req, res, next) => {
    const docId = req.params.collectionId;
    const docType = 'collection';
    const operation = 'unsave';

    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $pull: { savedCollections: docId } },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { ownUser: doc, docId, docType, operation },
    });
  });

  haveSavedCollection = catchAsync(async (req, res, next) => {
    const select = 'username';

    const doc = await this.#UserService.getUser(
      {
        _id: req.user.id,
        savedCollections: req.params.collectionId,
      },
      { select },
    );

    const haveSaved = !!doc;

    res.status(200).json({
      status: 'success',
      data: haveSaved,
    });
  });

  getSavedCollections = catchAsync(async (req, res, next) => {
    const data = await this.#UserService.getSavedCollections(
      req.params.username,
      req.query,
    );
    if (!data) return next(new AppError('No se encontró a ese usuario.', 404));

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.savedCollections,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  // createMockUsers = async (req, res) => {
  //   const data = await this.#UserService.createMockUsers();

  //   res.status(200).json({
  //     status: 'success',
  //     data,
  //   });
  // };
}

module.exports = UserController;
