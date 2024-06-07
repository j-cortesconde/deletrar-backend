const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const CommentService = require('../services/commentService');

class CommentController {
  #service = new CommentService();

  // Function that creates comments filtering out of the creating object the fields the user isnt allowed to enter
  createComment = async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'content',
      'targetPost',
      'targetCollection',
      'replyingTo',
      'replyingToArray',
      'status',
    );

    filteredBody.author = req.user?.username || null;
    filteredBody.createdAt = Date.now();

    const doc = await this.#service.createComment(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Updates the comment limiting the fields that can be updated (for now, only the status)
  updateComment = async (req, res, next) => {
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

    const oldDoc = await this.#service.getComment(req.params.id, { populate });

    if (!oldDoc) {
      return next(new AppError('No comment found with that ID', 404));
    }

    if (oldDoc.author.id !== req.user.id) {
      return next(
        new AppError("You don't own the comment you're trying to update", 400),
      );
    }

    const filteredBody = filterObj(req.body, 'status');

    if (Object.keys(filteredBody).length === 0) {
      return next(
        new AppError(
          "None of the fields you're trying to update are valid",
          400,
        ),
      );
    }

    const doc = await this.#service.updateComment(req.params.id, filteredBody, {
      new: true,
      runValidators: true,
      populate,
    });

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  // Only returns status="posted" comments
  getCommentsByPostId = async (req, res, next) => {
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
    const sort = { createdAt: -1 };

    const totalDocs = await this.#service.countComments(matchObject);

    const paginatedDocs = await this.#service.getComments(
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
  };

  // Only returns status="posted" comments
  getCommentsByCollectionId = async (req, res, next) => {
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
    const sort = { createdAt: -1 };

    const totalDocs = await this.#service.countComments(matchObject);

    const paginatedDocs = await this.#service.getComments(
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
  };

  // Only returns status="posted" comments
  getCommentsByRepliedCommentId = async (req, res, next) => {
    const replyingTo = mongoose.Types.ObjectId.createFromHexString(
      req.params.commentId,
    );

    const matchObject = {
      replyingTo,
      status: 'posted',
    };

    const populate = 'replies';
    const sort = { createdAt: -1 };

    const totalDocs = await this.#service.countComments(matchObject);

    const paginatedDocs = await this.#service.getComments(
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
  };

  getCommentThread = async (req, res, next) => {
    const populate = { path: 'replyingToArray', populate: 'replies' };

    const doc = await this.#service.getComment(req.params.commentId, {
      populate,
    });

    if (!doc) return next(new AppError('No comment found with that ID', 404));

    const docs = doc.replyingToArray;

    if (!docs)
      return next(
        new AppError('No comment thread found for that comment', 404),
      );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data: docs,
    });
  };

  getCommentById = async (req, res, next) => {
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

    const doc = await this.#service.getComment(req.params.id, { populate });

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
  };

  adminDeleteComment = async (req, res, next) => {
    const doc = await this.#service.deleteComment(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };
}

module.exports = CommentController;
