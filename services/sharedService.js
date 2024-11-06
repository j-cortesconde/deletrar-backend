const Shared = require('../models/sharedModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const { SHARED_LIMIT } = require('../utils/constants');

class SharedService {
  #Model = Shared;

  createShared(sharedObject) {
    return this.#Model.create(sharedObject);
  }

  getShareds(matchObject, optionsObject, reqQuery) {
    const limit = SHARED_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Model
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  countShareds(matchObject) {
    return this.#Model.countDocuments(matchObject);
  }

  getShared(sharedId, optionsObject) {
    return this.#Model.findById(sharedId, null, optionsObject);
  }

  updateShared(sharedId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(sharedId, updateObject, updateOptions);
  }

  deleteShared(sharedId) {
    return this.#Model.findByIdAndDelete(sharedId);
  }

  // TODO: These pipelines should be abstracted and combined intelligently (im repeating a lot of code and its getting confusing). Not MVP but soon
  getSharedsAggregation(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      // Lookup information for the sharer
      {
        $lookup: {
          from: 'users',
          localField: 'sharer',
          foreignField: 'username',
          pipeline: [{ $project: { _id: 1, username: 1, name: 1, photo: 1 } }],
          as: 'sharer',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          sharer: { $arrayElemAt: ['$sharer', 0] },
        },
      },
      // Lookup information for the sharedPost
      {
        $lookup: {
          from: 'posts',
          localField: 'sharedPost',
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
            // The user document is returned inside a one element array. This removes the array from between
            {
              $addFields: {
                author: { $arrayElemAt: ['$author', 0] },
              },
            },
          ],
          as: 'sharedPost',
        },
      },
      // The sharedPost document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          sharedPost: { $arrayElemAt: ['$sharedPost', 0] },
        },
      },
      // Lookup information for the sharedCollection
      {
        $lookup: {
          from: 'collections',
          localField: 'sharedCollection',
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
                posts: 1,
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
            // The user document is returned inside a one element array. This removes the array from between
            {
              $addFields: {
                collector: { $arrayElemAt: ['$collector', 0] },
              },
            },
            // Lookup information for the sharedCollection's posts
            {
              $lookup: {
                from: 'posts',
                localField: 'posts',
                foreignField: '_id',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      title: 1,
                      summary: 1,
                      coverImage: 1,
                      postedAt: 1,
                      author: 1,
                      status: 1,
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
                  // The user document is returned inside a one element array. This removes the array from between
                  {
                    $addFields: {
                      author: { $arrayElemAt: ['$author', 0] },
                    },
                  },
                ],
                as: 'posts',
              },
            },
          ],
          as: 'sharedCollection',
        },
      },
      // The collection document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          sharedCollection: { $arrayElemAt: ['$sharedCollection', 0] },
        },
      },
      // Lookup information for the sharedComment
      {
        $lookup: {
          from: 'comments',
          localField: 'sharedComment',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                author: 1,
                _id: 1,
                content: 1,
                targetPost: 1,
                targetCollection: 1,
                replyingTo: 1,
                replyingToArray: 1,
                postedAt: 1,
              },
            },
            // Lookup information for the author of the sharedComment
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  { $project: { _id: 1, username: 1, name: 1, photo: 1 } },
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
            // Lookup information for the targetPost of the sharedComment
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
                  // The user document is returned inside a one element array. This removes the array from between
                  {
                    $addFields: {
                      author: { $arrayElemAt: ['$author', 0] },
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
            // Lookup information for the targetCollection of the sharedComment
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
                  // The user document is returned inside a one element array. This removes the array from between
                  {
                    $addFields: {
                      collector: { $arrayElemAt: ['$collector', 0] },
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
            // Lookup information for the replyingTo comment of the sharedComment
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
              },
            },
          ],
          as: 'sharedComment',
        },
      },
      // The comment document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          sharedComment: { $arrayElemAt: ['$sharedComment', 0] },
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          sharer: 1,
          postedAt: 1,
          sharedPost: 1,
          sharedCollection: 1,
          sharedComment: 1,
          documentType: 1,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    return this.#Model.aggregate(features.pipeline);
  }
}

module.exports = SharedService;
