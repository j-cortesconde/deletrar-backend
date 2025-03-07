const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const SharedService = require('../services/sharedService');
const catchAsync = require('../utils/catchAsync');

class SharedController {
  #service = new SharedService();

  // Function that creates shareds filtering out of the creating object the fields the user isnt allowed to enter
  createShared = catchAsync(async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'sharedPost',
      'sharedCollection',
      'sharedComment',
      'content',
    );

    if (
      !filteredBody.sharedCollection &&
      !filteredBody.sharedPost &&
      !filteredBody.sharedComment
    ) {
      return next(
        new AppError(
          'Tenés que estar compartiendo un texto, una colección o un comentario. Por favor comunicate con un administrador.',
          400,
        ),
      );
    }

    filteredBody.sharer = req.user?.username || null;

    const doc = await this.#service.createShared(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  });

  // Updates the shared limiting the fields that can be updated (for now, only the status)
  updateShared = catchAsync(async (req, res, next) => {
    const oldDoc = await this.#service.getShared(req.params.id);

    if (!oldDoc) {
      return next(
        new AppError('No se encontró ese documento compartido.', 404),
      );
    }

    if (oldDoc.sharer.id !== req.user.id) {
      return next(
        new AppError(
          'No sos propietario del documento compartido que estás intentando modificar.',
          400,
        ),
      );
    }

    // As of now Im not allowing any change other than delete. Might add a change to content
    const filteredBody = filterObj(req.body, 'status');

    if (Object.keys(filteredBody).length === 0) {
      return next(
        new AppError(
          'Ninguno de los campos que estás intentando modificar es válido.',
          400,
        ),
      );
    }

    const doc = await this.#service.updateShared(
      { _id: req.params.id },
      filteredBody,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  // Only returns status="posted" shareds
  getAllShareds = catchAsync(async (req, res, next) => {
    const data = await this.#service.getSharedsAggregation(
      {
        status: 'posted',
      },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  });

  // Only returns status="posted" shareds
  getSharedsBySharer = catchAsync(async (req, res, next) => {
    const data = await this.#service.getSharedsAggregation(
      {
        sharer: req.params.username,
        status: 'posted',
      },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  });

  // Only returns status="posted" shareds
  // TODO: Is not limiting ammount. Might want to, but not MVP
  // TODO: Add populate for collection and forth. MVP
  getSharedsByPostId = catchAsync(async (req, res, next) => {
    const sharedPost = mongoose.Types.ObjectId.createFromHexString(
      req.params.postId,
    );

    const matchObject = {
      sharedPost,
      status: 'posted',
    };

    //TODO: Ver si esto es necesario o no (y si lo es, ver si no es mejor usar el aggregationGet). Si fuera necesairo habria que pasarlo dentro del objeto que pasa el sort
    // const populate = [
    //   { path: 'reply', populate: { path: 'replies' } },
    //   'replies',
    // ];
    const sort = { postedAt: -1 };

    const totalDocs = await this.#service.countShareds(matchObject);

    const paginatedDocs = await this.#service.getShareds(
      matchObject,
      { sort },
      req.query,
    );

    const response = {
      count: totalDocs,
      docs: paginatedDocs,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  // Only returns status="posted" shareds
  // TODO: Is not limiting ammount. Might want to, but not MVP
  // TODO: Add populate for collection and forth. MVP
  getSharedsByCollectionId = catchAsync(async (req, res, next) => {
    const sharedCollection = mongoose.Types.ObjectId.createFromHexString(
      req.params.collectionId,
    );

    const matchObject = {
      sharedCollection,
      status: 'posted',
    };

    //TODO: Ver si esto es necesario o no (y si lo es, ver si no es mejor usar el aggregationGet). Si fuera necesairo habria que pasarlo dentro del objeto que pasa el sort
    // const populate = [
    //   { path: 'reply', populate: { path: 'replies' } },
    //   'replies',
    // ];
    const sort = { postedAt: -1 };

    const totalDocs = await this.#service.countShareds(matchObject);

    const paginatedDocs = await this.#service.getShareds(
      matchObject,
      { sort },
      req.query,
    );

    const response = {
      count: totalDocs,
      docs: paginatedDocs,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  // Only returns status="posted" shareds

  // TODO: Is not limiting ammount. Might want to, but not MVP
  getSharedsByCommentId = catchAsync(async (req, res, next) => {
    const sharedComment = mongoose.Types.ObjectId.createFromHexString(
      req.params.commentId,
    );

    const matchObject = {
      sharedComment,
      status: 'posted',
    };

    const sort = { postedAt: -1 };

    const totalDocs = await this.#service.countShareds(matchObject);

    const paginatedDocs = await this.#service.getShareds(
      matchObject,
      { sort },
      req.query,
    );

    const response = {
      count: totalDocs,
      docs: paginatedDocs,
    };

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: response,
    });
  });

  // This is being done with getSharedsAggregation. Not using getShared, which may or may not be better. If this implementation fails, explore that before debugging this one
  getSharedById = catchAsync(async (req, res, next) => {
    const sharedId = mongoose.Types.ObjectId.createFromHexString(req.params.id);

    const { limitedDocuments } = await this.#service.getSharedsAggregation({
      _id: sharedId,
      status: 'posted',
    });

    const doc = limitedDocuments?.[0];

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró el documento compartido que estás buscando.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  adminDeleteShared = catchAsync(async (req, res, next) => {
    const doc = await this.#service.deleteShared(req.params.id);

    if (!doc) {
      return next(
        new AppError('No se encontró ese documento compartido.', 404),
      );
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
}

module.exports = SharedController;
