const Comment = require('../models/commentModel');
const { COMMENT_LIMIT } = require('../utils/constants');

class CommentService {
  #Model = Comment;

  createComment(commentObject) {
    return this.#Model.create(commentObject);
  }

  getComments(matchObject, optionsObject, reqQuery) {
    const limit = COMMENT_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Model
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  countComments(matchObject) {
    return this.#Model.countDocuments(matchObject);
  }

  getComment(commentId, optionsObject) {
    return this.#Model.findById(commentId, null, optionsObject);
  }

  updateComment(commentId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(
      commentId,
      updateObject,
      updateOptions,
    );
  }

  deleteComment(commentId) {
    return this.#Model.findByIdAndDelete(commentId);
  }
}

module.exports = CommentService;
