const Post = require('../models/postModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');
const { AGGREGATION_LIMIT } = require('../utils/constants');

class PostService {
  #Post = Post;

  createPost(postObject) {
    return this.#Post.create(postObject);
  }

  getAllPosts(reqQuery, selectOptions) {
    const features = new APIFeatures(this.#Post.find(), reqQuery)
      .filter()
      .sort()
      .paginate();

    if (selectOptions) {
      features.query = features.query.select(selectOptions);
    } else {
      features.limitFields();
    }

    return features.query;
  }

  async getPosts(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          postedAt: 1,
          updatedAt: 1,
          summary: 1,
          coverImage: 1,
          status: 1,
          author: 1,
          documentType: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: 'username',
          pipeline: [
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
      {
        $match: {
          'author.active': true,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    const result = await this.#Post.aggregate(features.pipeline);

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

  getPost(matchObject) {
    return this.#Post.aggregate([
      { $match: { ...matchObject } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: 'username',
          pipeline: [
            {
              $project: {
                _id: 1,
                id: { $toString: '$_id' },
                username: 1,
                name: 1,
                photo: 1,
                active: 1,
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
      {
        $match: {
          'author.active': true,
        },
      },
    ]);
  }

  updatePost(matchObject, updateObject, updateOptions) {
    return this.#Post.findByIdAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  updatePosts(matchObject, updateObject, updateOptions) {
    return this.#Post.updateMany(matchObject, updateObject, updateOptions);
  }

  deletePost(postId) {
    return this.#Post.findByIdAndDelete(postId);
  }

  // TODO: Could add filtering for posted documents that are private in their settings (but public to specific users). This would have a new layer of difficulty (maybe in the Controller)
  // TODO: Could add pagination
  searchPosts(searchTerm) {
    return this.#Post.aggregate([
      {
        $search: {
          index: 'posts',
          text: {
            query: searchTerm,
            fuzzy: { maxEdits: 1 },
            path: {
              wildcard: '*', // To search all fields in the index
            },
          },
          returnStoredSource: true, // To return only data stored in index (id, title, author)
        },
      },
      {
        $match: {
          status: 'posted', // Filter only posts with status "posted"
        },
      },
      {
        $lookup: {
          from: 'users', // Gets the entire user document that authored this post
          localField: 'author',
          foreignField: 'username',
          as: 'authorInfo',
        },
      },
      {
        $unwind: '$authorInfo',
      },
      {
        $project: {
          _id: 1,
          title: 1,
          summary: 1,
          coverImage: 1,
          status: 1,
          postedAt: 1,
          documentType: 1,
          author: {
            name: '$authorInfo.name',
            _id: '$authorInfo._id',
            username: '$authorInfo.username',
            active: '$authorInfo.active',
          },
        },
      },
      { $match: { 'author.active': true } },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = PostService;
