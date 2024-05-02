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
    const populate = [
      { path: 'posts', select: 'title -author' },
      { path: 'followers', select: 'name -following' },
    ];
    const select =
      'name username email photo description createdAt following role settings active';

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
      req.user.id,
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
      return next(new AppError('Must inform a username', 401));
    if (req.user.role !== 'invitee')
      return next(new AppError('User is already initialized', 401));

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'username');
    filteredBody.role = 'user';

    // 3) Update user document
    const updatedUser = await this.#service.updateUser(
      req.user.id,
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

  // Finds the document for the current logged in user and sets it 'active' property to false, effectively disabling it.
  deleteMe = async (req, res, next) => {
    try {
      await this.#checkPassword(req);
    } catch (error) {
      return next(error);
    }

    await this.#service.updateUser(req.user.id, { active: false });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  // Finds the document for the current logged in user and sets it 'active' property to true, effectively reenabling it.
  reactivateMe = async (req, res, next) => {
    const user = await this.#service.updateUser(
      req.user.id,
      { active: true },
      { new: true, includeInactive: true },
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

  getUserById = async (req, res, next) => {
    const populate = [
      { path: 'posts', select: 'title -author' },
      { path: 'followers', select: 'name -following' },
    ];
    const select = 'name username email photo description createdAt following';
    const doc = await this.#service.getUserById(req.params.id, {
      populate,
      select,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
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
    const doc = await this.#service.updateUser(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  deleteUser = async (req, res, next) => {
    const doc = await this.#service.deleteUser(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  followUser = async (req, res, next) => {
    await this.#service.followUser(req.user, req.params.id);

    res.status(200).json({
      status: 'success',
      data: req.user,
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
}

module.exports = UserController;
