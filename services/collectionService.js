const Collection = require('../models/collectionModel');
const AggregationFeatures = require('../utils/aggregationFeatures');
const APIFeatures = require('../utils/apiFeatures');

class CollectionService {
  #Model = Collection;

  createCollection(collectionObject) {
    return this.#Model.create(collectionObject);
  }

  getAllCollections(reqQuery, selectOptions) {
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

  getCollections(matchObject, reqQuery) {
    const basePipeline = [
      {
        $match: {
          status: 'posted',
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

    const features = new AggregationFeatures(basePipeline, reqQuery).paginate();

    return this.#Model.aggregate(features.pipeline);
  }

  getCollection(collectionId, optionsObject) {
    return this.#Model.findById(collectionId, null, optionsObject);
  }

  updateCollection(collectionId, updateObject, updateOptions) {
    return this.#Model.findByIdAndUpdate(
      collectionId,
      updateObject,
      updateOptions,
    );
  }

  deleteCollection(collectionId) {
    return this.#Model.findByIdAndDelete(collectionId);
  }

  // FIXME: Collection search isnt yet implemented
  // TODO: Could add filtering for posted documents that are private in their settings (but public to specific users). This would have a new layer of difficulty (maybe in the Controller)
  searchCollections(searchTerm) {
    return this.#Model.aggregate([
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
          from: 'users', // Gets the entire user document that authored this collection
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
          author: { name: '$authorInfo.name', _id: '$authorInfo._id' }, // Returns only the author's name & id
        },
      },
      {
        $limit: 10, // Limit results to 10 documents
      },
    ]);
  }
}

module.exports = CollectionService;
