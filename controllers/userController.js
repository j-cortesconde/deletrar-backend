// FIXME: I removed the catchAsync function from all methods that call services. Should add again somehow
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');
const AppError = require('../utils/appError');
const uploadImage = require('../utils/uploadImage');
const UserService = require('../services/userService');

class UserController {
  #service = new UserService();

  // Makes sure the user submitted a currentPassword and checks it's correct
  #checkPassword = async (req) => {
    // 1.1) Demands currentPassword
    if (!req.body.currentPassword)
      throw new AppError(
        'You must submit your currentPassword before continuing.',
        401,
      );

    const user = await this.#service.getUserById(req.user.id);

    if (
      !(await this.#service.isPasswordCorrect(user, req.body.currentPassword))
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
    const populate = [{ path: 'posts', select: 'title -author' }];
    const select =
      'name username email photo description createdAt role settings active';

    const doc = await this.#service.getUserById(req.user.id, {
      populate,
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
    const updatedUser = await this.#service.updateUser(
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
    const populate = [{ path: 'posts', select: 'title -author' }];
    const select =
      'name username email photo description createdAt role settings active';

    const updatedUser = await this.#service.updateUser(
      { _id: req.user.id },
      filteredBody,
      { populate, select, new: true, runValidators: true },
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

    await this.#service.updateUser({ _id: req.user.id }, { active: false });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  // Finds the document for the current logged in user and sets it 'active' property to true, effectively reenabling it.
  reactivateMe = async (req, res, next) => {
    const populate = [{ path: 'posts', select: 'title ' }];
    const select =
      'name username email photo description createdAt role settings active';

    const user = await this.#service.updateUser(
      { _id: req.user.id },
      { active: true },
      { populate, select, new: true, includeInactive: true },
    );

    res.status(200).json({
      status: 'success',
      data: user,
    });
  };

  getAllUsers = async (req, res, next) => {
    const doc = await this.#service.getAllUsers(
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
    const populate = [
      {
        path: 'posts',
        select: 'title summary coverImage postedAt updatedAt -author',
      },
    ];
    const select = 'name username email photo description createdAt';
    const doc = await this.#service.getUser(
      { username: req.params.username },
      {
        populate,
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
    const doc = await this.#service.createUser(req.body);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Shouldn't be used for password updating.
  updateUser = async (req, res, next) => {
    const doc = await this.#service.updateUser(
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
    const doc = await this.#service.deleteUser(req.params.username);

    if (!doc) {
      return next(new AppError('No document found with that username', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  followUser = async (req, res, next) => {
    await this.#service.updateUser(
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

    const otherUser = await this.#service.updateUser(
      { username: req.params.otherUsername },
      { $push: { followers: { $each: [req.user.username], $position: 0 } } },
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
    await this.#service.updateUser(
      { _id: req.user.id },
      { $pull: { following: req.params.otherUsername } },
      {
        new: true,
        runValidators: true,
      },
    );

    const otherUser = await this.#service.updateUser(
      { username: req.params.otherUsername },
      { $pull: { followers: req.user.username } },
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
    const docs = await this.#service.searchUsers(req.params.searchTerm);

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
    const data = await this.#service.getFollowingOrFollowers(
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
    const data = await this.#service.getFollowingOrFollowers(
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

    const doc = await this.#service.getUser(
      {
        username: req.params.ownUsername,
        follower: req.params.otherUsername,
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

    const doc = await this.#service.getUser(
      {
        username: req.params.ownUsername,
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
}

module.exports = UserController;
