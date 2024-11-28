const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const CommentService = require('../services/commentService');
const catchAsync = require('../utils/catchAsync');
const { ANONYMOUS_USERNAME } = require('../utils/constants');

class CommentController {
  #CommentService = new CommentService();

  // Function that creates comments filtering out of the creating object the fields the user isnt allowed to enter
  createComment = catchAsync(async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'content',
      'targetPost',
      'targetCollection',
      'replyingTo',
      'replyingToArray',
      'status',
    );

    // No debería suceder nunca, pero encontré algunos comments sin targetCollection ni targetPost. No sé cuándo ni cómo habrá sucedido, pero no voy a investigarlo ahora. Lo dejo como un TODO: para cuando salte este error
    if (!filteredBody.targetCollection && !filteredBody.targetPost) {
      return next(
        new AppError(
          'El comentario debe tener hacerse sobre un texto o una colección. Por favor comunicate con un administrador.',
          400,
        ),
      );
    }

    filteredBody.author = req.user?.username || ANONYMOUS_USERNAME;
    filteredBody.postedAt = Date.now();

    const doc = await this.#CommentService.createComment(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  });

  // Updates the comment limiting the fields that can be updated (for now, only the status)
  updateComment = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'targetCollection',
        model: 'Collection',
        select: 'title collector',
        foreignField: 'id',
      },
      {
        path: 'targetPost',
        model: 'Post',
        select: 'title author',
        foreignField: 'id',
      },
    ];

    const oldDoc = await this.#CommentService.getComment(req.params.id, {
      populate,
    });

    if (!oldDoc) {
      return next(new AppError('No se encontró ese comentario.', 404));
    }

    if (oldDoc.author.id !== req.user.id) {
      return next(
        new AppError(
          'No sos propietario del comentario que estás intentando modificar.',
          400,
        ),
      );
    }

    const filteredBody = filterObj(req.body, 'status');

    if (Object.keys(filteredBody).length === 0) {
      return next(
        new AppError(
          'Ninguno de los campos que estás intentando modificar es válido.',
          400,
        ),
      );
    }

    const doc = await this.#CommentService.updateComment(
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
  });

  // Only returns status="posted" comments
  getCommentsByPostId = catchAsync(async (req, res, next) => {
    const targetPost = mongoose.Types.ObjectId.createFromHexString(
      req.params.postId,
    );

    const matchObject = {
      targetPost,
      replyingTo: { $exists: false },
      status: 'posted',
    };

    const populate = [
      { path: 'reply', populate: { path: 'replies' } },
      'replies',
    ];
    const sort = { postedAt: -1 };

    const totalDocs = await this.#CommentService.countComments(matchObject);

    const paginatedDocs = await this.#CommentService.getComments(
      matchObject,
      { populate, sort },
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

  // Only returns status="posted" comments
  getCommentsByCollectionId = catchAsync(async (req, res, next) => {
    const targetCollection = mongoose.Types.ObjectId.createFromHexString(
      req.params.collectionId,
    );

    const matchObject = {
      targetCollection,
      replyingTo: { $exists: false },
      targetPost: { $exists: false },
      status: 'posted',
    };

    const populate = [
      { path: 'reply', populate: { path: 'replies' } },
      'replies',
    ];
    const sort = { postedAt: -1 };

    const totalDocs = await this.#CommentService.countComments(matchObject);

    const paginatedDocs = await this.#CommentService.getComments(
      matchObject,
      { populate, sort },
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

  // Only returns status="posted" comments
  getCommentsByRepliedCommentId = catchAsync(async (req, res, next) => {
    const replyingTo = mongoose.Types.ObjectId.createFromHexString(
      req.params.commentId,
    );

    const matchObject = {
      replyingTo,
      status: 'posted',
    };

    const populate = 'replies';
    const sort = { postedAt: 1 };

    const totalDocs = await this.#CommentService.countComments(matchObject);

    const paginatedDocs = await this.#CommentService.getComments(
      matchObject,
      { populate, sort },
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

  //TODO: ¿Debería de alguna forma limitar la cantidad de comentarios? Algún día quizás. No MVP
  getCommentThread = catchAsync(async (req, res, next) => {
    const populate = { path: 'replyingToArray', populate: 'replies' };

    const doc = await this.#CommentService.getComment(req.params.commentId, {
      populate,
    });

    if (!doc) return next(new AppError('No se encontró ese comentario.', 404));

    const docs = doc.replyingToArray;

    if (!docs)
      return next(
        new AppError(
          'No se encontró un hilo de respuestas para ese comentario.',
          404,
        ),
      );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: docs,
    });
  });

  getCommentById = catchAsync(async (req, res, next) => {
    const populate = [
      {
        path: 'targetCollection',
        model: 'Collection',
        select: 'title collector',
        foreignField: '_id',
        populate: {
          path: 'collector',
          select: 'name username',
          model: 'User',
          foreignField: 'username',
        },
      },
      {
        path: 'targetPost',
        model: 'Post',
        select: 'title author',
        foreignField: '_id',
        populate: {
          path: 'author',
          select: 'name username',
          model: 'User',
          foreignField: 'username',
        },
      },
      {
        path: 'replyingToArray',
        model: 'Comment',
        foreignField: '_id',
        populate: { path: 'replies' },
      },
      'replies',
    ];

    const doc = await this.#CommentService.getComment(req.params.id, {
      populate,
    });

    if (!doc || doc.status !== 'posted') {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ningún comentario con ese ID.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  adminDeleteComment = catchAsync(async (req, res, next) => {
    const doc = await this.#CommentService.deleteComment(req.params.id);

    if (!doc) {
      return next(new AppError('No se encontró ese comentario.', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
}

module.exports = CommentController;
