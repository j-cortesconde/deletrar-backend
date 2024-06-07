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

  getSavedPosts(username, reqQuery) {
    const page = Number(reqQuery.page) || 1;
    const userLimit = Number(reqQuery.limit) || AGGREGATION_LIMIT;
    const limit = userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;
    const sortBy = {};

    if (reqQuery.sortBy) {
      const sortArray = reqQuery.sortBy.split('-');
      sortBy[sortArray[0]] = sortArray[1] === 'asc' ? 1 : -1;
    }

    return this.#Model.aggregate([
      // Find the user by their username
      { $match: { username } },
      // Project only the savedPosts array field so the others don't get unwund
      { $project: { savedPosts: 1 } },
      // Unwind the savedPosts array to prepare for $lookup
      { $unwind: `$savedPosts` },
      // Lookup user documents based on the savedPosts array
      {
        $lookup: {
          from: 'posts',
          localField: 'savedPosts',
          foreignField: '_id',
          as: 'savedPosts',
        },
      },
      // Project the fields for the savedPosts post documents
      {
        $project: {
          savedPosts: {
            $map: {
              input: `$savedPosts`,
              as: 'post',
              in: {
                _id: '$$post._id',
                title: '$$post.title',
                summary: '$$post.summary',
                coverImage: '$$post.coverImage',
                postedAt: '$$post.postedAt',
                status: '$$post.status',
                author: '$$post.author',
                updatedAt: '$$post.updatedAt',
              },
            },
          },
        },
      },
      { $match: { 'savedPosts.status': 'posted' } },
      // Group the documents to calculate the total count of savedPosts documents
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $size: `$savedPosts` } },
          savedPosts: { $push: `$savedPosts` },
        },
      },
      // Flatten the array of savedPosts posts
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedPosts: {
            $reduce: {
              input: `$savedPosts`,
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      // Ensure the output documents match the desired structure and they get sorted
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedPosts: {
            $sortArray: {
              input: '$savedPosts',
              sortBy,
            },
          },
        },
      },
      // Ensure the output documents match the desired structure and they get paginated
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedPosts: {
            $slice: [`$savedPosts`, (page - 1) * limit, limit],
          },
        },
      },
    ]);
  }

  getSavedCollections(username, reqQuery) {
    const page = Number(reqQuery.page) || 1;
    const userLimit = Number(reqQuery.limit) || AGGREGATION_LIMIT;
    const limit = userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;
    const sortBy = {};

    if (reqQuery.sortBy) {
      const sortArray = reqQuery.sortBy.split('-');
      sortBy[sortArray[0]] = sortArray[1] === 'asc' ? 1 : -1;
    }

    return this.#Model.aggregate([
      // Find the user by their username
      { $match: { username } },
      // Project only the savedCollections array field so the others don't get unwund
      { $project: { savedCollections: 1 } },
      // Unwind the savedCollections array to prepare for $lookup
      { $unwind: `$savedCollections` },
      // Lookup collection documents based on the savedCollections array
      {
        $lookup: {
          from: 'collections',
          localField: 'savedCollections',
          foreignField: '_id',
          as: 'savedCollections',
        },
      },
      // Project the fields for the savedCollections collection documents
      {
        $project: {
          savedCollections: {
            $map: {
              input: `$savedCollections`,
              as: 'collection',
              in: {
                _id: '$$collection._id',
                title: '$$collection.title',
                subtitle: '$$collection.subtitle',
                summary: '$$collection.summary',
                coverImage: '$$collection.coverImage',
                postedAt: '$$collection.postedAt',
                status: '$$collection.status',
                collector: '$$collection.collector',
                updatedAt: '$$collection.updatedAt',
              },
            },
          },
        },
      },
      { $match: { 'savedCollections.status': 'posted' } },
      // Group the documents to calculate the total count of savedCollections documents
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $size: `$savedCollections` } },
          savedCollections: { $push: `$savedCollections` },
        },
      },
      // Flatten the array of savedCollections users
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedCollections: {
            $reduce: {
              input: `$savedCollections`,
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      // Ensure the output documents match the desired structure and they get sorted
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedCollections: {
            $sortArray: {
              input: '$savedCollections',
              sortBy,
            },
          },
        },
      },
      // Ensure the output documents match the desired structure and they get paginated
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          savedCollections: {
            $slice: [`$savedCollections`, (page - 1) * limit, limit],
          },
        },
      },
    ]);
  }
}

module.exports = UserService;
