const Collection = require('../models/collectionModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');

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

  getCollections(matchObject, reqQuery) {
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
          // TODO: Perhaps this should be projection the lookup of post titles
          posts: 1,
        },
      },
    ];

    const features = new AggregationFeatures(basePipeline, reqQuery)
      .sort()
      .paginate();

    return this.#Collection.aggregate(features.pipeline);
  }

  getCollection(collectionId, optionsObject) {
    return this.#Collection.findById(collectionId, null, optionsObject);
  }

  updateCollection(collectionId, updateObject, updateOptions) {
    return this.#Collection.findByIdAndUpdate(
      collectionId,
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
          collector: { name: '$collectorInfo.name', _id: '$collectorInfo._id' }, // Returns only the collector's name & id
        },
      },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = CollectionService;
