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
}

module.exports = PostService;
