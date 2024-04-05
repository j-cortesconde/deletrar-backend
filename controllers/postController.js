const sharp = require('sharp');
const Post = require('../models/postModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const uploadImage = require('../utils/uploadImage');

// If an 'image' type file is sent in the request as 'coverImage' field it gets uploaded to the memoryStorage
exports.uploadPostImage = uploadImage.single('coverImage');

// If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>posts
exports.resizePostImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `post-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/posts/${req.file.filename}`);

  next();
});

//TODO: updatePost and createPost need image uploading capabilities
// Function that creates posts filtering out of the creating object the fields the user isnt allowed to enter
exports.createPost = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'title',
    'content',
    'summary',
    'status',
    'settings',
  );
  filteredBody.author = req.user.id;
  filteredBody.currentVersion = 1;
  if (filteredBody.status === 'posted') filteredBody.postedAt = Date.now();
  if (req.file) filteredBody.coverImage = req.file.filename;

  const doc = await Post.create(filteredBody);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

//TODO: updatePost and createPost need image uploading capabilities
// Updates the post limiting the fields that can be updated, adding update time, counting number of versions and adding the document's previous state as a string to its previousVersion field.
exports.updatePost = catchAsync(async (req, res, next) => {
  const oldDoc = await Post.findById(req.params.id);

  if (!oldDoc) {
    return next(new AppError('No post found with that ID', 404));
  }

  if (oldDoc.author.id !== req.user.id) {
    return next(
      new AppError("You don't own the post you're trying to update", 400),
    );
  }

  const filteredBody = filterObj(
    req.body,
    'title',
    'content',
    'summary',
    'status',
    'settings',
  );

  if (Object.keys(filteredBody).length === 0) {
    return next(
      new AppError("None of the fields you're trying to update are valid", 400),
    );
  }

  filteredBody.previousVersion = JSON.stringify(oldDoc.toObject());
  filteredBody.currentVersion = oldDoc.currentVersion + 1;
  filteredBody.updatedAt = Date.now();
  if (filteredBody.status === 'posted' && oldDoc.status === 'editing')
    filteredBody.postedAt = Date.now();
  if (req.file) filteredBody.coverImage = req.file.filename;

  const doc = await Post.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

//Looks for a document's previous version. If no version number is specified in GET, the immediate previous is sent. Else, that which was specified.
exports.getPreviousVersion = catchAsync(async (req, res, next) => {
  const doc = await Post.findById(req.params.id);

  if (!doc) {
    return next(new AppError('No post found with that ID', 404));
  }

  if (!doc.previousVersion) {
    return next(new AppError('This post has no previous versions', 400));
  }

  // If no version was specified in params, the immediate previous is chosen
  const version = Number(req.params.version) || doc.currentVersion - 1;

  if (version > doc.currentVersion - 1 || version < 1) {
    return next(
      new AppError(
        `Choose a valid previous version number between ${doc.currentVersion - 1} and 1`,
        400,
      ),
    );
  }

  // The immediate previous version is produced
  let oldVersion = JSON.parse(doc.previousVersion);

  // If any version previous to the immedate previous version is required, then this loop searches for it until it gets to it.
  try {
    for (let i = doc.currentVersion - 1; i > version; i -= 1) {
      oldVersion = JSON.parse(oldVersion.previousVersion);
    }
  } catch (err) {
    // Redundancy error. Shouldn't occur if the rest of the code is working without bugs
    return next(
      new AppError('It seems you chose an invalid version number', 400),
    );
  }

  res.status(200).json({
    status: 'success',
    data: oldVersion,
  });
});

exports.getAllPosts = handlerFactory.getAll(Post);
exports.getPostById = handlerFactory.getOne(Post);
exports.deletePost = handlerFactory.deleteOne(Post);
