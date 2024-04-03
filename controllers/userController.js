const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// If an 'image' type file is sent in the request as 'photo' field it gets uploaded to the memoryStorage
exports.uploadUserPhoto = upload.single('photo');

// If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>users
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

// Helper fn that takes an object and a set of authorized keys and returns a new object excluding all none-authorized keys
// Used to limit all request bodies so they only what's authorized interacts with the db and not whatever was freely requested.
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// MW that sets current loggedin user's id as a param of the req so that getUserById searches for it's document.
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Updates currently loggedin user's information. Excludes password info and all info that isn't allowed to update this way (also allows to update photo path)
exports.updateMe = catchAsync(async (req, res, next) => {
  // 0) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }

  // 1.1) Demands currentPassword if user is trying to update the email address
  if (req.body.email) {
    if (!req.body.currentPassword)
      return next(
        new AppError(
          "It seems you're trying to update your email address. Please submit your currentPassword to do so.",
          401,
        ),
      );
    // 1.2) Get user's hashed password from collection
    const user = await User.findById(req.user.id).select('+password');

    // 1.3) Check if POSTed currentPassword is correct. If so, continues, else it errors
    if (
      !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
      return next(new AppError('The password you entered is wrong.', 401));
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
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Initializes the user (adds custom username and changes role from invitee to user)
exports.initializeMe = catchAsync(async (req, res, next) => {
  // 1) Make sure the request includes a username and the user isn't initiated (is invitee)
  if (!req.body.username) next(new AppError('Must inform a username', 401));
  if (req.user.role !== 'invitee')
    next(new AppError('User is already initialized', 401));

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'username');
  filteredBody.role = 'user';

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Finds the document for the current logged in user and sets it 'active' property to false, effectively disabling it.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getAllUsers = handlerFactory.getAll(User);
exports.getUserById = handlerFactory.getOne(User, {
  path: 'posts',
  select: 'title -author',
});

exports.createUser = handlerFactory.createOne(User);
// Shouldn't be used for password updating.
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
