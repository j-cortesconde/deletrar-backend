const { POST_LIMIT } = require('./constants');

class AggregationFeatures {
  constructor(pipeline, queryString) {
    this.pipeline = pipeline;
    this.queryString = queryString;
  }

  sort() {
    const sortBy = {};

    if (this.queryString.sortBy) {
      const sortArray = this.queryString.sortBy.split('-');
      sortBy[sortArray[0]] = sortArray[1] === 'asc' ? 1 : -1;
    } else {
      sortBy.postedAt = -1;
    }

    this.pipeline.push({
      $sort: {
        ...sortBy,
      },
    });

    return this;
  }

  paginate() {
    const page = Number(this.queryString.page) || 1;

    this.pipeline.push({
      $facet: {
        // Stage 1: Count total documents
        totalCount: [
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
            },
          },
        ],
        // Stage 2: Limit documents
        limitedDocuments: [
          { $skip: (page - 1) * POST_LIMIT },
          { $limit: POST_LIMIT },
        ],
      },
    });

    return this;
  }
}

module.exports = AggregationFeatures;
