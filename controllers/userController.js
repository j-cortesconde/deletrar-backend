// FIXME: I removed the catchAsync function from all methods that call services. Should add again somehow
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');
const AppError = require('../utils/appError');
const uploadImage = require('../utils/uploadImage');
const UserService = require('../services/userService');
const PostService = require('../services/postService');
const CollectionService = require('../services/collectionService');
const CommentService = require('../services/commentService');
const SharedService = require('../services/sharedService');

class UserController {
  #UserService = new UserService();

  #PostService = new PostService();

  #CollectionService = new CollectionService();

  #CommentService = new CommentService();

  #SharedService = new SharedService();

  // Makes sure the user submitted a currentPassword and checks it's correct
  #checkPassword = async (req) => {
    // 1.1) Demands currentPassword
    if (!req.body.currentPassword)
      throw new AppError(
        'You must submit your currentPassword before continuing.',
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
      throw new AppError('The password you entered is wrong.', 401);
    }
  };

  // If an 'image' type file is sent in the request as 'photo' field it gets uploaded to the memoryStorage
  uploadUserPhoto = uploadImage.single('photo');

  // If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>users
  // FIXME: Shouldn't this become a service too?
  resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.file.filename}`);

    next();
  });

  // Returns the logged in users' information
  // FIXME: This is duplicating getUserById code. PosSol: Pass (req.params.id || req.user.id) into .getUserById()
  // TODO: Update. It shouldnt be duplicating. Now it gets different info for frontend route protection (like inactive, state and role)
  getMe = async (req, res, next) => {
    const select =
      'name username email photo description createdAt role settings active';

    const doc = await this.#UserService.getUserById(req.user.id, {
      select,
      includeInactive: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  // Updates currently loggedin user's information. Excludes password info and all info that isn't allowed to update this way (also allows to update photo path)
  updateMe = async (req, res, next) => {
    // 0) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
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
    const filteredBody = filterObj(
      req.body,
      'name',
      'description',
      'email',
      'settings',
    );
    if (req.file) filteredBody.photo = req.file.filename;

    // 3) Update user document
    const updatedUser = await this.#UserService.updateUser(
      { _id: req.user.id },
      filteredBody,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  };

  // Initializes the user (adds custom username and changes role from invitee to user)
  initializeMe = async (req, res, next) => {
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
      filteredBody,
      { select, new: true, runValidators: true },
    );

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  };

  // Finds the document for the current logged in user and sets it 'active' property to false, effectively disabling it.
  deleteMe = async (req, res, next) => {
    try {
      await this.#checkPassword(req);
    } catch (error) {
      return next(error);
    }

    await this.#UserService.updateUser({ _id: req.user.id }, { active: false });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  // Finds the document for the current logged in user and sets it 'active' property to true, effectively reenabling it.
  reactivateMe = async (req, res, next) => {
    const select =
      'name username email photo description createdAt role settings active';

    const user = await this.#UserService.updateUser(
      { _id: req.user.id },
      { active: true },
      { select, new: true, includeInactive: true },
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  };

  getAllUsers = async (req, res, next) => {
    const doc = await this.#UserService.getUsers(
      {},
      req.query,
      'name username email photo description createdAt',
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: doc,
    });
  };

  getUserByUsername = async (req, res, next) => {
    const select =
      'name username email photo description followerAmount createdAt';
    const doc = await this.#UserService.getUser(
      { username: req.params.username },
      {
        select,
      },
    );

    if (!doc) {
      return next(new AppError('No document found with that username', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  createUser = async (req, res, next) => {
    const doc = await this.#UserService.createUser(req.body);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Shouldn't be used for password updating.
  updateUser = async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { username: req.params.username },
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!doc) {
      return next(new AppError('No document found with that username', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  deleteUser = async (req, res, next) => {
    const doc = await this.#UserService.deleteUser(req.params.username);

    if (!doc) {
      return next(new AppError('No document found with that username', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  followUser = async (req, res, next) => {
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
  };

  unfollowUser = async (req, res, next) => {
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
  };

  searchUsers = async (req, res, next) => {
    const docs = await this.#UserService.searchUsers(req.params.searchTerm);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };

  // FIXME: HAVE TO CHANGE THIS as i said below
  // TODO: The following/follower model isnt ideal. The way it is now, there is a way to order by oldest/latest followed user (the users one follows) but not by oldest/latest following user (the users that follow one). Better solution is out there
  // TODO: Expanding on this. If you add a followers array field to the user schema and each time a user follows another one the followed username gets unshifted into the following array field of the follower document and the follower username gets unshifted into the followers array field of the followed user, then both the following and the followers arrays become ordered from latest first to oldest last. If this is done so, the getFollowers service should be changed for something that resembles the current state of the getFollowing one (a common service could even be created that just gets passed in the name of the field queried, following/followers)
  getFollowers = async (req, res, next) => {
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
  };

  getFollowing = async (req, res, next) => {
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
  };

  isFollower = async (req, res, next) => {
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
  };

  amFollowing = async (req, res, next) => {
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
  };

  savePost = async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      {
        $push: {
          savedPosts: { $each: [req.params.postId], $position: 0 },
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
      data: { ownUser: doc, docId: req.params.postId },
    });
  };

  unsavePost = async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $pull: { savedPosts: req.params.postId } },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { ownUser: doc, docId: req.params.postId },
    });
  };

  haveSavedPost = async (req, res, next) => {
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
  };

  getSavedPosts = async (req, res, next) => {
    const data = await this.#UserService.getSavedPosts(
      req.params.username,
      req.query,
    );
    if (!data)
      return next(new AppError('No user found with that username', 404));

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.savedPosts,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  };

  saveCollection = async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      {
        $push: {
          savedCollections: { $each: [req.params.collectionId], $position: 0 },
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
      data: { ownUser: doc, docId: req.params.collectionId },
    });
  };

  unsaveCollection = async (req, res, next) => {
    const doc = await this.#UserService.updateUser(
      { _id: req.user.id },
      { $pull: { savedCollections: req.params.collectionId } },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: { ownUser: doc, docId: req.params.collectionId },
    });
  };

  haveSavedCollection = async (req, res, next) => {
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
  };

  getSavedCollections = async (req, res, next) => {
    const data = await this.#UserService.getSavedCollections(
      req.params.username,
      req.query,
    );
    if (!data)
      return next(new AppError('No user found with that username', 404));

    const response = {
      count: data[0]?.totalAmount,
      docs: data[0]?.savedCollections,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  };

  // TODO: Estoy agregando Posts y Collections por fecha de publicación, no por fecha de actualización. Agregar esto es posible funcionalidad futura (no MVP). Tampoco estoy agregando replies a comments de gente que sigo: funcionalidad futura al cuadrado (no MVP al cudadrado)
  getUserFeed = async (req, res) => {
    // Get the list of followed users
    const rawFollowing = await this.#UserService.getFullFollowingIds(
      req.user.username,
    );
    const following = rawFollowing?.[0].following;

    // Fetch recent posts and collections by followed users
    const rawPosts = await this.#PostService.getPosts({
      author: { $in: following },
      status: 'posted',
    });
    const posts = {
      totalCount: rawPosts?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawPosts?.[0]?.limitedDocuments,
    };

    const rawCollections = await this.#CollectionService.getCollections({
      collector: { $in: following },
      status: 'posted',
    });
    const collections = {
      totalCount: rawCollections?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawCollections?.[0]?.limitedDocuments,
    };

    const rawComments = await this.#CommentService.getCommentsAggregation({
      author: { $in: following },
      status: 'posted',
    });
    const comments = {
      totalCount: rawComments?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawComments?.[0]?.limitedDocuments,
    };

    const rawShareds = await this.#SharedService.getSharedsAggregation({
      sharer: { $in: following },
      status: 'posted',
    });

    const shareds = {
      totalCount: rawShareds?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawShareds?.[0]?.limitedDocuments,
    };

    // Add counts for the response (totalCount for the total amount of documents in collection and actualCount for total amount of documents in the response)
    const totalCount = {
      comments: comments?.totalCount || 0,
      collections: collections?.totalCount || 0,
      posts: posts?.totalCount || 0,
      shareds: shareds?.totalCount || 0,
    };
    const actualCount = {
      posts: posts?.limitedDocuments.length,
      collections: collections?.limitedDocuments.length,
      comments: comments?.limitedDocuments.length,
      shareds: shareds?.limitedDocuments.length,
    };

    // Combine all results and sort by `postedAt`
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ].sort((a, b) => b.postedAt - a.postedAt);

    res.status(200).json({
      status: 'success',
      data: {
        count: { totalCount, actualCount },
        limitedDocuments,
      },
    });
  };
}

module.exports = UserController;
