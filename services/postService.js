// const { default: axios } = require('axios');
const Post = require('../models/postModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');
const { AGGREGATION_LIMIT } = require('../utils/constants');
const mockPostData = require('../helpers/postPreload');
const mockData = require('../helpers/userPreload');

class PostService {
  #Post = Post;

  createPost(postObject) {
    return this.#Post.create(postObject);
  }

  getAllPosts(reqQuery, selectOptions) {
    const features = new APIFeatures(this.#Post.find(), reqQuery)
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

  async getPosts(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          postedAt: 1,
          updatedAt: 1,
          summary: 1,
          coverImage: 1,
          status: 1,
          author: 1,
          documentType: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: 'username',
          pipeline: [
            { $project: { _id: 1, username: 1, name: 1, photo: 1, active: 1 } },
          ],
          as: 'author',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] },
        },
      },
      {
        $match: {
          'author.active': true,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    const result = await this.#Post.aggregate(features.pipeline);

    // This was added so you can have hasNextPage & nextPage for infinite pagination (feed scrolling on frontEnd)
    const totalCount = result?.[0]?.totalCount?.[0]?.totalCount;
    const limitedDocuments = result?.[0]?.limitedDocuments;

    const page = Number(reqQuery?.page) || 1;
    const userLimit = Number(reqQuery?.limit) || AGGREGATION_LIMIT;
    const actualLimit =
      userLimit < AGGREGATION_LIMIT ? userLimit : AGGREGATION_LIMIT;
    const skip = (page - 1) * actualLimit;

    const hasNextPage = skip + limitedDocuments.length < totalCount;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      limitedDocuments,
      totalCount,
      hasNextPage,
      nextPage,
    };
  }

  getPost(matchObject) {
    return this.#Post.aggregate([
      { $match: { ...matchObject } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: 'username',
          pipeline: [
            {
              $project: {
                _id: 1,
                id: { $toString: '$_id' },
                username: 1,
                name: 1,
                photo: 1,
                active: 1,
              },
            },
          ],
          as: 'author',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] },
        },
      },
      {
        $match: {
          'author.active': true,
        },
      },
    ]);
  }

  updatePost(matchObject, updateObject, updateOptions) {
    return this.#Post.findByIdAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  updatePosts(matchObject, updateObject, updateOptions) {
    return this.#Post.updateMany(matchObject, updateObject, updateOptions);
  }

  deletePost(postId) {
    return this.#Post.findByIdAndDelete(postId);
  }

  // TODO: Could add filtering for posted documents that are private in their settings (but public to specific users). This would have a new layer of difficulty (maybe in the Controller)
  // TODO: Could add pagination
  searchPosts(searchTerm) {
    return this.#Post.aggregate([
      {
        $search: {
          index: 'posts',
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
          status: 'posted', // Filter only posts with status "posted"
        },
      },
      {
        $lookup: {
          from: 'users', // Gets the entire user document that authored this post
          localField: 'author',
          foreignField: 'username',
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
          coverImage: 1,
          status: 1,
          postedAt: 1,
          documentType: 1,
          author: {
            name: '$authorInfo.name',
            _id: '$authorInfo._id',
            username: '$authorInfo.username',
            active: '$authorInfo.active',
          },
        },
      },
      { $match: { 'author.active': true } },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }

  async createMockPosts() {
    function removeAccents(str) {
      return str
        .normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, ''); // Remove all diacritical marks
    }

    const newPosts = await Promise.all(
      mockPostData.posts.map(async (post, index) => {
        const mockPost = { ...post };
        mockPost.coverImage =
          mockPostData.images[index] ||
          'https://fastly.picsum.photos/id/915/1200/400.jpg?hmac=ADZybA0RtIpO_BbuEWi1GWCyDHqKUOMv3sUuuaViKms';

        if (index < 30) {
          const [firstName, lastName] = mockData.names[index].split(' ');
          const username = removeAccents(
            firstName.slice(0, 1).concat(lastName).toLowerCase(),
          );

          mockPost.author = username;
        } else if (index < 40) {
          mockPost.author = 'jcortesconde';
        } else if (index < 43) {
          mockPost.author = 'bananator1';
        } else if (index < 46) {
          mockPost.author = 'jcortescondet';
        } else if (index < 49) {
          mockPost.author = 'twilightreporter';
        } else {
          mockPost.author = 'jcortesconde';
        }

        if (index % 3 === 0) {
          mockPost.status = 'editing';
        } else if (index % 3 === 1) {
          mockPost.status = 'posted';
        } else if (index % 3 === 2) {
          mockPost.status = 'deleted';
        }
        return await this.#Post.create(mockPost);
      }),
    );

    return newPosts;
  }

  // async getRandomImages() {
  //   const imageLinks = await Promise.all(
  //     mockPostData.posts.map(
  //       // eslint-disable-next-line no-unused-vars
  //       async (post) => {
  //         const response = await axios.get('https://picsum.photos/1200/400');
  //         return response.request.res.responseUrl;
  //       },
  //     ),
  //   );

  //   return imageLinks;
  // }
}

module.exports = PostService;
