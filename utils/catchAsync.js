// FIXME: This should be entirely removed (it was even causing issues with authentication, making some methods return before they finished awaiting)
// TODO: This should be entirely removed (it was even causing issues with authentication, making some methods return before they finished awaiting)
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
