const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const uploadImage = require('../utils/uploadImage');
const PostService = require('../services/postService');

class PostController {
  #service = new PostService();

  // If an 'image' type file is sent in the request as 'coverImage' field it gets uploaded to the memoryStorage
  uploadPostImage = uploadImage.single('coverImage');

  // If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>posts
  //FIXME: CatchAsync and shouldnt it be service?
  resizePostImage = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `post-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/posts/${req.file.filename}`);

    next();
  });

  // Function that creates posts filtering out of the creating object the fields the user isnt allowed to enter
  createPost = async (req, res, next) => {
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

    const doc = await this.#service.createPost(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Updates the post limiting the fields that can be updated, adding update time, counting number of versions (posted versions) and adding the document's previous state as a string to its previousVersion field (if both previous and new version are posted versions).
  updatePost = async (req, res, next) => {
    const oldDoc = await this.#service.getPost(req.params.id);

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
        new AppError(
          "None of the fields you're trying to update are valid",
          400,
        ),
      );
    }

    if (filteredBody.status === 'posted' && oldDoc.status === 'editing')
      filteredBody.postedAt = Date.now();

    if (filteredBody.status === 'posted' && oldDoc.status === 'posted') {
      filteredBody.previousVersion = JSON.stringify(oldDoc.toObject());
      filteredBody.currentVersion = oldDoc.currentVersion + 1;
    }
    if (req.file) filteredBody.coverImage = req.file.filename;
    filteredBody.updatedAt = Date.now();

    const doc = await this.#service.updatePost(req.params.id, filteredBody, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  //Looks for a document's previous version. If no version number is specified in GET, the immediate previous is sent. Else, that which was specified.
  getPreviousVersion = async (req, res, next) => {
    const doc = await this.#service.getPost(req.params.id);

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
  };

  getAllPosts = async (req, res, next) => {
    const docs = await this.#service.getAllPosts(req.query, '-settings');

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };

  // TODO: I could add a setting to posts where one could set post visibility (specific users that could see other users editing posts, private posted posts, etc) and add that logic here
  getPostById = async (req, res, next) => {
    const doc = await this.#service.getPost(req.params.id, null, '-settings');

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ningún texto con ese ID.',
      });
    }

    if (doc.status !== 'posted' && doc.author._id !== req.user.id) {
      return res.status(401).json({
        status: 'fail',
        message: 'No tiene autorización para visualizar este texto.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  userDeletePost = async (req, res, next) => {
    const oldDoc = await this.#service.getPost(req.params.id);

    if (!oldDoc) {
      return next(new AppError('No post found with that ID', 404));
    }

    if (oldDoc.author.id !== req.user.id) {
      return next(
        new AppError("You don't own the post you're trying to update", 400),
      );
    }

    const doc = await this.#service.updatePost(
      req.params.id,
      { status: 'deleted' },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  adminDeletePost = async (req, res, next) => {
    const doc = await this.#service.deletePost(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  searchPosts = async (req, res, next) => {
    const docs = await this.#service.searchPosts(req.params.searchTerm);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };
}

module.exports = PostController;
