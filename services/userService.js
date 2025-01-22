// FIXME: REFACTOR so you don't have to search for users you can pass in (eg req.user or others previously searched users)
const User = require('../models/userModel');
const APIFeatures = require('../utils/apiFeatures');
const { AGGREGATION_LIMIT } = require('../utils/constants');
// const mockData = require('../helpers/userPreload');

class UserService {
  #User = User;

  createUser(userObject) {
    return this.#User.create(userObject);
  }

  getUsers(matchObject, reqQuery, selectOptions) {
    const features = new APIFeatures(this.#User.find(matchObject), reqQuery)
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
    return this.#User.findById(userId, null, optionsObject);
  }

  getUser(matchObject, optionsObject) {
    return this.#User.findOne(matchObject, null, optionsObject);
  }

  updateUser(matchObject, updateObject, updateOptions) {
    return this.#User.findOneAndUpdate(
      matchObject,
      { $set: updateObject },
      updateOptions,
    );
  }

  deleteUser(userId) {
    return this.#User.findByIdAndDelete(userId);
  }

  isPasswordCorrect(user, submittedPassword) {
    return user?.correctPassword(submittedPassword);
  }

  changedPasswordAfter(user, JWTTimestamp) {
    return user.changedPasswordAfter(JWTTimestamp);
  }

  findOneUser(query, optionsObject) {
    return this.#User.findOne(query, null, optionsObject);
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
    return this.#User.aggregate([
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
        $match: {
          active: true, // Filter only users which are active
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

    return this.#User.aggregate([
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

  // Costly method used for getting the feed
  getFullFollowingIds(username) {
    return this.#User.aggregate([
      // Find the user by their username
      { $match: { username } },
      // Project only the following array field so the others don't get unwund
      { $project: { following: 1 } },
      // Unwind the following array to prepare for $lookup
      { $unwind: `$following` },
      // Lookup user documents based on the following array
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: 'username',
          as: 'following',
        },
      },
      // Project the fields for the following user documents
      {
        $project: {
          following: {
            $map: {
              input: `$following`,
              as: 'user',
              in: '$$user.username',
            },
          },
        },
      },
      // Group to collect all _id values into a single array
      {
        $group: {
          _id: null,
          following: { $push: `$following` },
        },
      },
      // Flatten the array of following users
      {
        $project: {
          _id: 0,
          following: {
            $reduce: {
              input: `$following`,
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
    ]);
  }

  getSavedPosts(username, reqQuery) {
    const page = Number(reqQuery?.page) || 1;
    const userLimit = Number(reqQuery?.limit) || AGGREGATION_LIMIT;
    const limit = userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;
    const sortBy = {};

    if (reqQuery?.sortBy) {
      const sortArray = reqQuery?.sortBy.split('-');
      sortBy[sortArray[0]] = sortArray[1] === 'asc' ? 1 : -1;
    } else {
      sortBy.postedAt = -1;
    }

    return this.#User.aggregate([
      // Find the user by their username
      { $match: { username } },
      // Project only the savedPosts array field so the others don't get unwund
      { $project: { savedPosts: 1 } },
      // Unwind the savedPosts array to prepare for $lookup
      { $unwind: `$savedPosts` },
      // Lookup post documents based on the savedPosts array
      {
        $lookup: {
          from: 'posts',
          localField: 'savedPosts',
          foreignField: '_id',
          pipeline: [
            // Project each savedPost post document
            {
              $project: {
                _id: 1,
                title: 1,
                summary: 1,
                coverImage: 1,
                postedAt: 1,
                status: 1,
                author: 1,
                updatedAt: 1,
              },
            },
            // Lookup user documents from each post document's author
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                as: 'author',
                pipeline: [
                  // Project each author user document
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      username: 1,
                      photo: 1,
                    },
                  },
                ],
              },
            },
            // The user document is returned inside a one element array. This removes the array from between
            {
              $addFields: {
                author: { $arrayElemAt: ['$author', 0] },
              },
            },
          ],
          as: 'savedPosts',
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
    } else {
      sortBy.postedAt = -1;
    }

    return this.#User.aggregate([
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
          pipeline: [
            // Project each savedCollection collection document
            {
              $project: {
                _id: 1,
                title: 1,
                subtitle: 1,
                summary: 1,
                coverImage: 1,
                postedAt: 1,
                status: 1,
                collector: 1,
                updatedAt: 1,
              },
            },
            // Lookup user documents from each collection document's collector
            {
              $lookup: {
                from: 'users',
                localField: 'collector',
                foreignField: 'username',
                as: 'collector',
                pipeline: [
                  // Project each collector user document
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      username: 1,
                      photo: 1,
                    },
                  },
                ],
              },
            },
            // The user document is returned inside a one element array. This removes the array from between
            {
              $addFields: {
                collector: { $arrayElemAt: ['$collector', 0] },
              },
            },
          ],
          as: 'savedCollections',
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

  // async createMockUsers() {
  //   function removeAccents(str) {
  //     return str
  //       .normalize('NFD') // Normalize to decomposed form
  //       .replace(/[\u0300-\u036f]/g, ''); // Remove all diacritical marks
  //   }

  //   const newUsers = await Promise.all(
  //     mockData.names.map(async (name, index) => {
  //       const [firstName, lastName] = name.split(' ');
  //       const username = removeAccents(
  //         firstName.slice(0, 1).concat(lastName).toLowerCase(),
  //       );
  //       const email = username.concat('@deletrar.com');

  //       const mockUser = { ...mockData.userExamples[0] };
  //       mockUser.role = 'user';
  //       mockUser.name = name;
  //       mockUser.username = username;
  //       mockUser.email = email;
  //       mockUser.password = 'Admin!1234';
  //       mockUser.passwordConfirm = 'Admin!1234';
  //       // '$2a$12$BryDI.szpL7zoVUwCndHPezW8VDei1EYuSQ9UvgcwntVuzcJ8t65W';
  //       mockUser.description = mockData.descriptions[index];
  //       mockUser.photo = `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${index + 1}.jpg`;

  //       return await this.#User.create(mockUser);
  //     }),
  //   );

  //   return newUsers;
  // }
}

module.exports = UserService;
