// TODO: Isnt there a better way to handle text versions by creating multiple documents that point to the initial doc instead of saving each version in a field?

const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const CollectionService = require('../services/collectionService');
const catchAsync = require('../utils/catchAsync');

class CollectionController {
  #CollectionService = new CollectionService();

  // Function that creates collections filtering out of the creating object the fields the user isnt allowed to enter
  createCollection = catchAsync(async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'title',
      'subtitle',
      'summary',
      'posts',
      'status',
      'settings',
    );
    filteredBody.collector = req.user.username;
    filteredBody.updatedAt = Date.now();
    if (filteredBody.status === 'posted') filteredBody.postedAt = Date.now();
    if (req.file) filteredBody.coverImage = req.file.filename;

    const doc = await this.#CollectionService.createCollection(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  });

  // Updates the collection limiting the fields that can be updated, adding update time.
  updateCollection = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author postedAt coverImage',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name',
          foreignField: 'username',
        },
      },
    ];

    const oldDoc = await this.#CollectionService.getCollection(req.params.id, {
      populate,
    });

    if (!oldDoc) {
      return next(
        new AppError(
          'No se encontró la colección que estás intentando modificar.',
          404,
        ),
      );
    }

    if (oldDoc.collector.id !== req.user.id) {
      return next(
        new AppError(
          'No sos propietario de la colección que estás intentando modificar.',
          400,
        ),
      );
    }

    const filteredBody = filterObj(
      req.body,
      'title',
      'subtitle',
      'summary',
      'posts',
      'status',
      'settings',
    );

    if (Object.keys(filteredBody).length === 0) {
      return next(
        new AppError(
          'Ninguno de los campos que estás intentando modificar es válido.',
          400,
        ),
      );
    }

    if (filteredBody.status === 'posted' && !oldDoc.postedAt)
      filteredBody.postedAt = Date.now();

    if (req.file) filteredBody.coverImage = req.file.filename;
    filteredBody.updatedAt = Date.now();

    const doc = await this.#CollectionService.updateCollection(
      { _id: req.params.id },
      filteredBody,
      {
        new: true,
        runValidators: true,
        populate,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  // Only returns status="posted" collections
  getAllCollections = catchAsync(async (req, res, next) => {
    req.query.status = 'posted';

    const docs = await this.#CollectionService.getAllCollections(
      req.query,
      '-settings',
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  });

  // Only returns status="posted" collections
  getCollectionsByCollectorUsername = catchAsync(async (req, res, next) => {
    const data = await this.#CollectionService.getCollections(
      { collector: req.params.username, status: 'posted' },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  });

  // Returns collections where status isn't "posted"
  getOwnHiddenCollections = catchAsync(async (req, res, next) => {
    const data = await this.#CollectionService.getCollections(
      { collector: req.user.username, status: { $ne: 'posted' } },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  });

  // TODO: I could add a setting to collections where one could set collection visibility (specific users that could see other users editing collections, private posted collections, etc) and add that logic here
  getCollectionById = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name username photo',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author postedAt coverImage status',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name username photo',
          foreignField: 'username',
        },
      },
    ];
    const doc = await this.#CollectionService.getCollection(req.params.id, {
      populate,
    });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ninguna colección con ese ID.',
      });
    }

    if (doc.status !== 'posted' && doc.collector.id !== req.user.id) {
      return res.status(401).json({
        status: 'fail',
        message: 'No tenés autorización para acceder a esta colección.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  adminDeleteCollection = catchAsync(async (req, res, next) => {
    const doc = await this.#CollectionService.deleteCollection(req.params.id);

    if (!doc) {
      return next(new AppError('No se encontró la colección.', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  searchCollections = catchAsync(async (req, res, next) => {
    const docs = await this.#CollectionService.searchCollections(
      req.params.searchTerm,
    );

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  });

  addPost = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author postedAt coverImage',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name',
          foreignField: 'username',
        },
      },
    ];

    const doc = await this.#CollectionService.updateCollection(
      { _id: req.params.id },
      {
        $push: { posts: req.body.postId },
      },
      {
        new: true,
        runValidators: true,
        populate,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  removePost = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author postedAt coverImage',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name',
          foreignField: 'username',
        },
      },
    ];

    const doc = await this.#CollectionService.updateCollection(
      { _id: req.params.id },
      { $pull: { posts: req.body.postId } },
      {
        new: true,
        runValidators: true,
        populate,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  movePost = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author postedAt coverImage',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name',
          foreignField: 'username',
        },
      },
    ];

    await this.#CollectionService.updateCollection(
      { _id: req.params.id },
      {
        $pull: { posts: req.body.postId },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    const doc = await this.#CollectionService.updateCollection(
      { _id: req.params.id },
      {
        $push: {
          posts: { $each: [req.body.postId], $position: req.body.position },
        },
      },
      {
        new: true,
        runValidators: true,
        populate,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });
}

module.exports = CollectionController;
