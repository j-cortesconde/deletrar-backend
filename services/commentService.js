const Comment = require('../models/commentModel');
const AggregationFeatures = require('../utils/aggregationFeatures');

class CommentService {
  #Model = Comment;

  createComment(commentObject) {
    return this.#Model.create(commentObject);
  }

  // TODO: Must review comment pagination
  getComments(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          author: 1,
          targetPost: 1,
          targetCollection: 1,
          replyingTo: 1,
          createdAt: 1,
          status: 1,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery).paginate();

    return this.#Model.aggregate(features.pipeline);
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
