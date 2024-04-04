// Helper fn that takes an object and a set of authorized keys and returns a new object excluding all none-authorized keys
// Used to limit all request bodies so they only what's authorized interacts with the db and not whatever was freely requested.
module.exports = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
