const Comment = require('../models/commentModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
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

  getCommentsAggregation(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      // Lookup information for the author
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: 'username',
          pipeline: [{ $project: { _id: 1, username: 1, name: 1, photo: 1 } }],
          as: 'author',
        },
      },
      // Lookup information for the targetPost
      {
        $lookup: {
          from: 'posts',
          localField: 'targetPost',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                author: 1,
                _id: 1,
                title: 1,
                summary: 1,
                coverImage: 1,
                updatedAt: 1,
                postedAt: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      photo: 1,
                    },
                  },
                ],
                as: 'author',
              },
            },
          ],
          as: 'targetPost',
        },
      },
      // Lookup information for the targetCollection
      {
        $lookup: {
          from: 'collections',
          localField: 'targetCollection',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                collector: 1,
                _id: 1,
                title: 1,
                subtitle: 1,
                summary: 1,
                coverImage: 1,
                updatedAt: 1,
                postedAt: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'collector',
                foreignField: 'username',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      photo: 1,
                    },
                  },
                ],
                as: 'collector',
              },
            },
          ],
          as: 'targetCollection',
        },
      },
      // Lookup information for the replyingTo comment
      {
        $lookup: {
          from: 'comments',
          localField: 'replyingTo',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                content: 1,
                author: 1,
                replyingToArray: 1,
                replyingTo: 1,
                createdAt: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      photo: 1,
                    },
                  },
                ],
                as: 'author',
              },
            },
          ],
          as: 'replyingTo',
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          author: 1,
          replyingToArray: 1,
          createdAt: 1,
          targetPost: 1,
          targetCollection: 1,
          replyingTo: 1,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    return this.#Model.aggregate(features.pipeline);
  }
}

module.exports = CommentService;
