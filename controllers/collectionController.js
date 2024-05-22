// TODO: Isnt there a better way to handle text versions by creating multiple documents that point to the initial doc instead of saving each version in a field?

const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const uploadImage = require('../utils/uploadImage');
const CollectionService = require('../services/collectionService');

class CollectionController {
  #service = new CollectionService();

  // If an 'image' type file is sent in the request as 'coverImage' field it gets uploaded to the memoryStorage
  uploadCollectionImage = uploadImage.single('coverImage');

  // If an 'image' type file was uploaded to the memoryStorage, it gets a filename, it gets reshaped/reformatted and it is uploaded to public>img>collections
  //FIXME: CatchAsync and shouldnt it be service?
  resizeCollectionImage = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `collection-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/collections/${req.file.filename}`);

    next();
  });

  // Function that creates collections filtering out of the creating object the fields the user isnt allowed to enter
  createCollection = async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'title',
      'subtitle',
      'summary',
      'posts',
      'postIntroductions',
      'status',
      'settings',
    );
    filteredBody.collector = req.user.username;
    filteredBody.updatedAt = Date.now();
    if (filteredBody.status === 'shared') filteredBody.sharedAt = Date.now();
    if (req.file) filteredBody.coverImage = req.file.filename;

    const doc = await this.#service.createCollection(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Updates the collection limiting the fields that can be updated, adding update time, counting number of versions (shared versions) and adding the document's previous state as a string to its previousVersion field (if both previous and new version are shared versions).
  updateCollection = async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
    ];

    const oldDoc = await this.#service.getCollection(req.params.id, {
      populate,
    });

    if (!oldDoc) {
      return next(new AppError('No collection found with that ID', 404));
    }

    if (oldDoc.collector.id !== req.user.id) {
      return next(
        new AppError(
          "You don't own the collection you're trying to update",
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
      'postIntroductions',
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

    if (filteredBody.status === 'shared' && !oldDoc.sharedAt)
      filteredBody.sharedAt = Date.now();

    if (req.file) filteredBody.coverImage = req.file.filename;
    filteredBody.updatedAt = Date.now();

    const doc = await this.#service.updateCollection(
      req.params.id,
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
  };

  // Only returns status="shared" collections
  getAllCollections = async (req, res, next) => {
    req.query.status = 'shared';

    const docs = await this.#service.getAllCollections(req.query, '-settings');

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };

  // Only returns status="shared" collections
  getCollectionsByCollectorUsername = async (req, res, next) => {
    const data = await this.#service.getCollections(
      { collector: req.params.username },
      req.query,
    );

    const response = {
      count: data[0]?.totalCount[0]?.totalCount,
      docs: data[0]?.limitedDocuments,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  };

  // TODO: I could add a setting to collections where one could set collection visibility (specific users that could see other users editing collections, private posted collections, etc) and add that logic here
  getCollectionById = async (req, res, next) => {
    const populate = [
      {
        path: 'collector',
        model: 'User',
        select: 'name username',
        foreignField: 'username',
      },
      {
        path: 'posts',
        model: 'Post',
        select: 'title author',
        populate: {
          path: 'author',
          model: 'User',
          select: 'name',
          foreignField: 'username',
        },
      },
    ];
    const doc = await this.#service.getCollection(req.params.id, { populate });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ninguna colección con ese ID.',
      });
    }

    if (doc.status !== 'shared' && doc.collector.id !== req.user.id) {
      return res.status(401).json({
        status: 'fail',
        message: 'No tiene autorización para acceder a esta colección.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  adminDeleteCollection = async (req, res, next) => {
    const doc = await this.#service.deleteCollection(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  // FIXME: Collection search isnt yet implemented
  searchCollections = async (req, res, next) => {
    const docs = await this.#service.searchCollections(req.params.searchTerm);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };
}

module.exports = CollectionController;
