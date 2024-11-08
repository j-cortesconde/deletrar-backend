const Post = require('../models/postModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');

class PostService {
  #Model = Post;

  createPost(postObject) {
    return this.#Model.create(postObject);
  }

  getAllPosts(reqQuery, selectOptions) {
    const features = new APIFeatures(this.#Model.find(), reqQuery)
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

  getPosts(matchObject, reqQuery) {
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
          pipeline: [{ $project: { _id: 1, username: 1, name: 1, photo: 1 } }],
          as: 'author',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] },
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    return this.#Model.aggregate(features.pipeline);
  }

  getPost(postId, optionsObject) {
    return this.#Model.findById(postId, null, optionsObject);
  }

  updatePost(filterObject, updateObject, updateOptions) {
    return this.#Model.findOneAndUpdate(
      filterObject,
      updateObject,
      updateOptions,
    );
  }

  updatePosts(filterObject, updateObject, updateOptions) {
    return this.#Model.updateMany(filterObject, updateObject, updateOptions);
  }

  deletePost(postId) {
    return this.#Model.findByIdAndDelete(postId);
  }

  // TODO: Could add filtering for posted documents that are private in their settings (but public to specific users). This would have a new layer of difficulty (maybe in the Controller)
  // TODO: Could add pagination
  searchPosts(searchTerm) {
    return this.#Model.aggregate([
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
          documentType: 1,
          author: {
            name: '$authorInfo.name',
            _id: '$authorInfo._id',
            username: '$authorInfo.username',
          }, // Returns only the author's name & id
        },
      },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = PostService;
