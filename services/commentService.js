const Comment = require('../models/commentModel');
// const AggregationFeatures = require('../utils/aggregationFeatures');

class CommentService {
  #Model = Comment;

  createComment(commentObject) {
    return this.#Model.create(commentObject);
  }

  // TODO: Must review comment pagination
  getComments(matchObject, optionsObject, reqQuery) {
    return this.#Model.find(matchObject, null, optionsObject);
  }

  // TODO: Must review comment pagination
  countComments(matchObject) {
    return this.#Model.estimatedDocumentCount(matchObject);
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
