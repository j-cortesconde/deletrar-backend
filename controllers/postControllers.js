const Post = require('../models/postModel');
const handlerFactory = require('./handlerFactory');

exports.getAllPosts = handlerFactory.getAll(Post);
exports.getPostById = handlerFactory.getOne(Post);
exports.createPost = handlerFactory.createOne(Post);
exports.updatePost = handlerFactory.updateOne(Post);
exports.deletePost = handlerFactory.deleteOne(Post);
