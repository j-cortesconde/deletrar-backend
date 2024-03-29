const User = require('../models/userModel');
const handlerFactory = require('./handlerFactory');

exports.getAllUsers = handlerFactory.getAll(User);
exports.getUserById = handlerFactory.getOne(User, {
  path: 'posts',
  select: 'title -author',
});

exports.createUser = handlerFactory.createOne(User);
// Shouldn't be used for password updating.
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
