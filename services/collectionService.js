const Collection = require('../models/collectionModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');
const { AGGREGATION_LIMIT } = require('../utils/constants');

class CollectionService {
  #Collection = Collection;

  createCollection(collectionObject) {
    return this.#Collection.create(collectionObject);
  }

  getAllCollections(reqQuery, selectOptions) {
    const features = new APIFeatures(this.#Collection.find(), reqQuery)
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

  async getCollections(matchObject, reqQuery) {
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
          subtitle: 1,
          postedAt: 1,
          updatedAt: 1,
          summary: 1,
          coverImage: 1,
          status: 1,
          collector: 1,
          posts: 1,
          documentType: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'collector',
          foreignField: 'username',
          pipeline: [
            { $project: { _id: 1, username: 1, name: 1, photo: 1, active: 1 } },
          ],
          as: 'collector',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          collector: { $arrayElemAt: ['$collector', 0] },
        },
      },
      {
        $match: {
          'collector.active': true,
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'posts',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                author: 1,
                title: 1,
                // summary: 1,
                postedAt: 1,
                coverImage: 1,
                status: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
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
          ],
          as: 'posts',
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    const result = await this.#Collection.aggregate(features.pipeline);

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

  // getCollection(collectionId, optionsObject) {
  //   return this.#Collection.findById(collectionId, null, optionsObject);
  // }
  getCollection(matchObject) {
    return this.#Collection.aggregate([
      {
        $match: {
          ...matchObject,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'collector',
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
          as: 'collector',
        },
      },
      // The user document is returned inside a one element array. This removes the array from between
      {
        $addFields: {
          collector: { $arrayElemAt: ['$collector', 0] },
        },
      },
      {
        $match: {
          'collector.active': true,
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'posts',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                author: 1,
                title: 1,
                summary: 1,
                postedAt: 1,
                coverImage: 1,
                status: 1,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: 'username',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
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
          ],
          as: 'posts',
        },
      },
    ]);
  }

  updateCollection(matchObject, updateObject, updateOptions) {
    return this.#Collection.findByIdAndUpdate(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  updateCollections(matchObject, updateObject, updateOptions) {
    return this.#Collection.updateMany(
      matchObject,
      updateObject,
      updateOptions,
    );
  }

  deleteCollection(collectionId) {
    return this.#Collection.findByIdAndDelete(collectionId);
  }

  // TODO: Could add filtering for posted documents that are private in their settings (but public to specific users). This would have a new layer of difficulty (maybe in the Controller)
  // TODO: Could add pagination
  searchCollections(searchTerm) {
    return this.#Collection.aggregate([
      {
        $search: {
          index: 'collections',
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
          status: 'posted', // Filter only collections with status "posted"
        },
      },
      {
        $lookup: {
          from: 'users', // Gets the entire user document that authored this collection
          localField: 'collector',
          foreignField: 'username',
          as: 'collectorInfo',
        },
      },
      {
        $unwind: '$collectorInfo',
      },
      {
        $project: {
          _id: 1,
          title: 1,
          summary: 1,
          coverImage: 1,
          status: 1,
          documentType: 1,
          collector: {
            name: '$collectorInfo.name',
            _id: '$collectorInfo._id',
            username: '$collectorInfo.username',
            active: '$collectorInfo.active',
          },
        },
      },
      { $match: { 'collector.active': true } },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = CollectionService;
