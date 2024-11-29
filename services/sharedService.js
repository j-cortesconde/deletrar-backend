const Shared = require('../models/sharedModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const { SHARED_LIMIT, AGGREGATION_LIMIT } = require('../utils/constants');

class SharedService {
  #Shared = Shared;

  createShared(sharedObject) {
    return this.#Shared.create(sharedObject);
  }

  getShareds(matchObject, optionsObject, reqQuery) {
    const limit = SHARED_LIMIT;
    const skip = reqQuery?.page ? (reqQuery.page - 1) * limit : 0;

    return this.#Shared
      .find(matchObject, null, optionsObject)
      .skip(skip)
      .limit(limit);
  }

  countShareds(matchObject) {
    return this.#Shared.countDocuments(matchObject);
  }

  getShared(sharedId, optionsObject) {
    return this.#Shared.findById(sharedId, null, optionsObject);
  }

  updateShared(filterObject, updateObject, updateOptions) {
    return this.#Shared.findOneAndUpdate(
      filterObject,
      updateObject,
      updateOptions,
    );
  }

  updateShareds(filterObject, updateObject, updateOptions) {
    return this.#Shared.updateMany(filterObject, updateObject, updateOptions);
  }

  deleteShared(sharedId) {
    return this.#Shared.findByIdAndDelete(sharedId);
  }

  // TODO: These pipelines should be abstracted and combined intelligently (im repeating a lot of code and its getting confusing). Not MVP but soon
  async getSharedsAggregation(matchObject, reqQuery) {
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
          pipeline: [
            { $project: { _id: 1, username: 1, name: 1, photo: 1, active: 1 } },
          ],
          as: 'sharer',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          sharer: { $arrayElemAt: ['$sharer', 0] },
        },
      },
      {
        $match: {
          'sharer.active': true,
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
              $facet: {
                posted: [
                  { $match: { status: 'posted' } },
                  {
                    $project: {
                      author: 1,
                      _id: 1,
                      title: 1,
                      summary: 1,
                      coverImage: 1,
                      updatedAt: 1,
                      postedAt: 1,
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
                notPosted: [
                  { $match: { status: { $ne: 'posted' } } },
                  { $project: { _id: 1, status: 1 } },
                ],
              },
            },
            {
              $project: {
                result: {
                  $cond: {
                    if: { $eq: [{ $size: '$posted' }, 0] },
                    then: '$notPosted',
                    else: '$posted',
                  },
                },
              },
            },
            {
              $unwind: '$result', // Flatten the resulting array if you expect one document at a time
            },
            { $replaceRoot: { newRoot: '$result' } },
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
              $facet: {
                posted: [
                  { $match: { status: 'posted' } },
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
                      status: 1,
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
                notPosted: [
                  { $match: { status: { $ne: 'posted' } } },
                  { $project: { _id: 1, status: 1 } },
                ],
              },
            },
            {
              $project: {
                result: {
                  $cond: {
                    if: { $eq: [{ $size: '$posted' }, 0] },
                    then: '$notPosted',
                    else: '$posted',
                  },
                },
              },
            },
            {
              $unwind: '$result', // Flatten the resulting array if you expect one document at a time
            },
            { $replaceRoot: { newRoot: '$result' } },
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
              $facet: {
                posted: [
                  { $match: { status: 'posted' } },
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
                      status: 1,
                    },
                  },
                  // Lookup information for the author of the sharedComment
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'author',
                      foreignField: 'username',
                      pipeline: [
                        { $match: { active: true } },
                        {
                          $project: { _id: 1, username: 1, name: 1, photo: 1 },
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
                            status: 1,
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
                      targetCollection: {
                        $arrayElemAt: ['$targetCollection', 0],
                      },
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
                            status: 1,
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
                      status: 1,
                    },
                  },
                ],
                notPosted: [
                  { $match: { status: { $ne: 'posted' } } },
                  { $project: { _id: 1, status: 1 } },
                ],
              },
            },
            {
              $project: {
                result: {
                  $cond: {
                    if: { $eq: [{ $size: '$posted' }, 0] },
                    then: '$notPosted',
                    else: '$posted',
                  },
                },
              },
            },
            {
              $unwind: '$result', // Flatten the resulting array if you expect one document at a time
            },
            { $replaceRoot: { newRoot: '$result' } },
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

    const result = await this.#Shared.aggregate(features.pipeline);

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

module.exports = SharedService;
