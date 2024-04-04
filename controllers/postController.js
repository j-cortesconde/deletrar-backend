const Post = require('../models/postModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');

// MW that sets the logged in user as the author of whatever comes next
exports.setAuthor = (req, res, next) => {
  req.body.author = req.user.id;
  next();
};

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
    'imageCover',
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
exports.createPost = handlerFactory.createOne(Post);
exports.deletePost = handlerFactory.deleteOne(Post);
