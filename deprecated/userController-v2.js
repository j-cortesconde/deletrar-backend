// FIXME: I removed the catchAsync function. Should add again
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const filterObj = require('../utils/filterObj');
const AppError = require('../utils/appError');
const uploadImage = require('../utils/uploadImage');
const userService = require('../services/userService');

// Makes sure the user submitted a currentPassword and checks it's correct
const checkPassword = async (req) => {
  // 1.1) Demands currentPassword
  if (!req.body.currentPassword)
    throw new AppError(
      'You must submit your currentPassword before continuing.',
      401,
    );

  if (
    !(await userService.isPasswordCorrect(
      req.user.id,
      req.body.currentPassword,
    ))
  ) {
    // 1.3) Check if POSTed currentPassword is correct. If so, continues, else it errors
    throw new AppError('The password you entered is wrong.', 401);
  }
};

// If an 'image' type file is sent in the request as 'photo' field it gets uploaded to the memoryStorage
exports.uploadUserPhoto = uploadImage.single('photo');

// If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>users
// FIXME: Shouldn't this become a service too?
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// MW that sets current loggedin user's id as a param of the req so that getUserById searches for it's document.
// FIXME: This is duplicating getUserById code.
exports.getMe = async (req, res, next) => {
  const doc = await userService.getUser(
    req.user.id,
    {
      path: 'posts',
      select: 'title -author',
    },
    'name username email photo description createdAt',
  );

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
};

// Updates currently loggedin user's information. Excludes password info and all info that isn't allowed to update this way (also allows to update photo path)
exports.updateMe = async (req, res, next) => {
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
      await checkPassword(req);
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
  const updatedUser = await userService.updateUser(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
};

// Initializes the user (adds custom username and changes role from invitee to user)
exports.initializeMe = async (req, res, next) => {
  // 1) Make sure the request includes a username and the user isn't initiated (is invitee)
  if (!req.body.username) next(new AppError('Must inform a username', 401));
  if (req.user.role !== 'invitee')
    next(new AppError('User is already initialized', 401));

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'username');
  filteredBody.role = 'user';

  // 3) Update user document
  const updatedUser = await userService.updateUser(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
};

// Finds the document for the current logged in user and sets it 'active' property to false, effectively disabling it.
exports.deleteMe = async (req, res, next) => {
  try {
    await checkPassword(req);
  } catch (error) {
    return next(error);
  }

  await userService.updateUser(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
};

// Finds the document for the current logged in user and sets it 'active' property to true, effectively reenabling it.
exports.reactivateMe = async (req, res, next) => {
  const user = await userService.updateUser(
    req.user.id,
    { active: true },
    { new: true, includeInactive: true },
  );

  res.status(200).json({
    status: 'success',
    data: { user },
  });
};

exports.getAllUsers = async (req, res, next) => {
  const doc = await userService.getAllUsers(
    req.query,
    'name username email photo description createdAt',
  );

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc,
    },
  });
};

exports.getUserById = async (req, res, next) => {
  const doc = await userService.getUser(
    req.params.id,
    {
      path: 'posts',
      select: 'title -author',
    },
    'name username email photo description createdAt',
  );

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
};

exports.createUser = async (req, res, next) => {
  const doc = await userService.createUser(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
};

// Shouldn't be used for password updating.
exports.updateUser = async (req, res, next) => {
  const doc = await userService.updateUser(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
};

exports.deleteUser = async (req, res, next) => {
  const doc = await userService.deleteUser(req.params.id);

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
};
