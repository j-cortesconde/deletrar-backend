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
      'post',
      'collection',
      'replyingTo',
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

  // Only returns status="posted" comments
  getCommentsByPostId = async (req, res, next) => {
    const data = await this.#service.getComments(
      { post: req.params.postId, status: 'posted' },
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

  // Only returns status="posted" comments
  getCommentsByCollectionId = async (req, res, next) => {
    const data = await this.#service.getComments(
      { collection: req.params.collectionId, status: 'posted' },
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

  // Only returns status="posted" comments
  getCommentsByRepliedCommentId = async (req, res, next) => {
    const data = await this.#service.getComments(
      { collection: req.params.commentId, status: 'posted' },
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

  getCommentById = async (req, res, next) => {
    const populate = [
      {
        path: 'collection',
        model: 'Collection',
        select: 'title collector',
        foreignField: 'id',
      },
      {
        path: 'post',
        model: 'Post',
        select: 'title author',
        foreignField: 'id',
      },
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
