// FIXME: REFACTOR so you don't have to search for users you can pass in (eg req.user or others previously searched users)
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

  setInvitee(user) {
    user.role = 'invitee';
    return user.save({ validateBeforeSave: false });
  }

  createPasswordResetToken(user) {
    const resetToken = user.createPasswordResetToken();
    user.save({ validateBeforeSave: false });
    return resetToken;
  }

  clearPasswordResetToken(user) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    return user.save({ validateBeforeSave: false });
  }

  setPassword(user, passwordObject) {
    const { password, passwordConfirm } = passwordObject;
    user.password = password;
    user.passwordConfirm = passwordConfirm;
    return user.save();
  }

  // Might be inefficient. Check with .push (in case the field is being indexed) or without populating. Double updating
  followUser(currentUser, followUserId) {
    currentUser.following.unshift(followUserId);
    return currentUser.save();
  }

  searchUsers(searchTerm) {
    return this.#Model.aggregate([
      {
        $search: {
          index: 'users',
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
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = UserService;
