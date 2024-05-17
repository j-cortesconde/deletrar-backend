// FIXME: REFACTOR so you don't have to search for users you can pass in (eg req.user or others previously searched users)
const User = require('../models/userModel');
const APIFeatures = require('../utils/apiFeatures');
const { AGGREGATION_LIMIT } = require('../utils/constants');

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

  getUser(matchObject, optionsObject) {
    return this.#Model.findOne(matchObject, null, optionsObject);
  }

  updateUser(matchObject, updateObject, updateOptions) {
    return this.#Model.findOneAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
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

  getFollowingOrFollowers(getFieldName, username, reqQuery) {
    const page = Number(reqQuery.page) || 1;
    const userLimit = Number(reqQuery.limit) || AGGREGATION_LIMIT;
    const limit = userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;

    return this.#Model.aggregate([
      // Find the user by their username
      { $match: { username } },
      // Project only the following array field so the others don't get unwund
      { $project: { [getFieldName]: 1 } },
      // Unwind the following array to prepare for $lookup
      { $unwind: `$${getFieldName}` },
      // Lookup user documents based on the following array
      {
        $lookup: {
          from: 'users',
          localField: getFieldName,
          foreignField: 'username',
          as: getFieldName,
        },
      },
      // Project the fields for the following user documents
      {
        $project: {
          [getFieldName]: {
            $map: {
              input: `$${getFieldName}`,
              as: 'user',
              in: {
                username: '$$user.username',
                name: '$$user.name',
                description: '$$user.description',
                photo: '$$user.photo',
              },
            },
          },
        },
      },
      // Group the documents to calculate the total count of following documents
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $size: `$${getFieldName}` } },
          [getFieldName]: { $push: `$${getFieldName}` },
        },
      },
      // Flatten the array of following users
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          [getFieldName]: {
            $reduce: {
              input: `$${getFieldName}`,
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      // Ensure the output documents match the desired structure
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          [getFieldName]: {
            $slice: [`$${getFieldName}`, (page - 1) * limit, limit],
          },
        },
      },
    ]);
  }
}

module.exports = UserService;
