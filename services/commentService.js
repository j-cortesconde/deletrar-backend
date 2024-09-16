const Comment = require('../models/commentModel');
const { COMMENT_LIMIT } = require('../utils/constants');

class CommentService {
  #Comment = Comment;

  createComment(commentObject) {
    return this.#Comment.create(commentObject);
  }

  getComments(matchObject, optionsObject, reqQuery) {
    const limit = COMMENT_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Comment
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  countComments(matchObject) {
    return this.#Comment.countDocuments(matchObject);
  }

  getComment(commentId, optionsObject) {
    return this.#Comment.findById(commentId, null, optionsObject);
  }

  updateComment(commentId, updateObject, updateOptions) {
    return this.#Comment.findByIdAndUpdate(
      commentId,
      updateObject,
      updateOptions,
    );
  }

  deleteComment(commentId) {
    return this.#Comment.findByIdAndDelete(commentId);
  }
}

module.exports = CommentService;
