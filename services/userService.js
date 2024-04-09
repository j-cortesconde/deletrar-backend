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

  getUserById(userId, optionsObject) {
    return this.#Model.findById(userId, null, optionsObject);
  }

  updateUser(userId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(userId, updateObject, updateOptions);
  }

  deleteUser(userId) {
    return this.#Model.findByIdAndDelete(userId);
  }

  isPasswordCorrect(user, submittedPassword) {
    return user?.correctPassword(submittedPassword);
  }

  changedPasswordAfter(user, JWTTimestamp) {
    return user.changedPasswordAfter(JWTTimestamp);
  }

  findOneUser(query, optionsObject) {
    return this.#Model.findOne(query, null, optionsObject);
  }
}

module.exports = UserService;
