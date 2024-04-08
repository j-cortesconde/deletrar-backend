const User = require('../models/userModel');
const APIFeatures = require('../utils/apiFeatures');

class UserService {
  #Model = User;

  createUser(userObject) {
    return this.#Model.create(userObject);
  }

  getAllUsers(reqQuery, selectOptions) {
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

  getUser(userId, populateOptions, selectOptions) {
    console.log(`At service: ${userId}`);
    let query = this.#Model.findById(userId);
    if (populateOptions) query = query.populate(populateOptions);
    if (selectOptions) query = query.select(selectOptions);

    return query;
  }

  updateUser(userId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(userId, updateObject, updateOptions);
  }

  deleteUser(userId) {
    return this.#Model.findByIdAndDelete(userId);
  }

  async isPasswordCorrect(userId, submittedPassword) {
    // 1) Get user's hashed password from collection
    const user = await User.findById(userId).select('+password');

    // 2) Check if POSTed currentPassword is correct. If so, continues, else it errors
    return user.correctPassword(submittedPassword, user.password);
  }
}

const userService = new UserService();

module.exports = userService;
