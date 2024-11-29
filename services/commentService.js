const Comment = require('../models/commentModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const { COMMENT_LIMIT, AGGREGATION_LIMIT } = require('../utils/constants');

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

  updateComments(filterObject, updateObject, updateOptions) {
    return this.#Comment.updateMany(filterObject, updateObject, updateOptions);
  }

  deleteComment(commentId) {
    return this.#Comment.findByIdAndDelete(commentId);
  }

  async getCommentsAggregation(matchObject, reqQuery) {
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
          pipeline: [
            { $match: { active: true } },
            { $project: { _id: 1, username: 1, name: 1, photo: 1, active: 1 } },
          ],
          as: 'author',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] },
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
                _id: 1,
                title: 1,
              },
            },
          ],
          as: 'targetPost',
        },
      },
      // The post document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          targetPost: { $arrayElemAt: ['$targetPost', 0] },
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
                _id: 1,
                title: 1,
              },
            },
          ],
          as: 'targetCollection',
        },
      },
      // The collection document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          targetCollection: { $arrayElemAt: ['$targetCollection', 0] },
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
                author: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  { $match: { active: true } },
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                    },
                  },
                ],
                as: 'author',
              },
            },
            // The user document is returned inside a one element array. This removes the array from between
            {
              $addFields: {
                author: { $arrayElemAt: ['$author', 0] },
              },
            },
          ],
          as: 'replyingTo',
        },
      },
      // The comment document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          replyingTo: { $arrayElemAt: ['$replyingTo', 0] },
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          author: 1,
          replyingToArray: 1,
          postedAt: 1,
          targetPost: 1,
          targetCollection: 1,
          replyingTo: 1,
          documentType: 1,
          status: 1,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    const result = await this.#Comment.aggregate(features.pipeline);

    // This was added so you can have hasNextPage & nextPage for infinite pagination (feed scrolling on frontEnd)
    const totalCount = result?.[0]?.totalCount?.[0]?.totalCount;
    const limitedDocuments = result?.[0]?.limitedDocuments;

    const page = Number(reqQuery?.page) || 1;
    const userLimit = Number(reqQuery?.limit) || AGGREGATION_LIMIT;
    const actualLimit =
      userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;
    const skip = (page - 1) * actualLimit;

    const hasNextPage = skip + limitedDocuments.length < totalCount;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      limitedDocuments,
      totalCount,
      hasNextPage,
      nextPage,
    };
  }
}

module.exports = CommentService;
