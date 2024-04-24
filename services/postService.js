const Post = require('../models/postModel');
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

  getPost(postId, populateOptions, selectOptions) {
    let query = this.#Model.findById(postId);
    if (populateOptions) query = query.populate(populateOptions);
    if (selectOptions) query = query.select(selectOptions);

    return query;
  }

  updatePost(postId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(postId, updateObject, updateOptions);
  }

  deletePost(postId) {
    return this.#Model.findByIdAndDelete(postId);
  }

  async searchPosts(searchTerm) {
    return this.#Model.aggregate([
      {
        $search: {
          index: 'posts',
          text: {
            query: searchTerm,
            path: {
              wildcard: '*', // To search all fields in the index
            },
          },
          returnStoredSource: true, // To return only data stored in index (id, title, author)
        },
      },
      {
        $lookup: {
          from: 'users', // Assuming the name of the collection is 'users'
          localField: 'author',
          foreignField: '_id',
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
          content: 1,
          author: { name: '$authorInfo.name' },
        },
      },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = PostService;
