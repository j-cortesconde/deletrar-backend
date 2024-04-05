const { QUERY_LIMIT } = require('./constants');

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // A) Basic filtering
    let queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // B) Advanced filtering
    // I- For quantity operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    queryObj = JSON.parse(queryStr);

    // II- For regular expressions
    Object.keys(queryObj).forEach((key) => {
      const value = queryObj[key];
      if (
        typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, 'regex')
      ) {
        queryObj[key] = { $regex: new RegExp(value.regex, 'i') };
      } else {
        queryObj[key] = value;
      }
    });

    this.query = this.query.find(queryObj);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  // FIXME: Maybe this should change (and all APIFeatures, to reflect a React sending queries through body and not through a modification of the URL. MAYBE)
  paginate() {
    const page = Number(this.queryString.page) || 1;
    const userLimit = Number(this.queryString.limit) || QUERY_LIMIT;
    const limit = userLimit < QUERY_LIMIT ? userLimit : QUERY_LIMIT;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
