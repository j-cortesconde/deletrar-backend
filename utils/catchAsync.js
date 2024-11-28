// This function is basically a try/catch wrapper for async controller functions
// IMPORTANT: This function should only wrap functions which are ONLY called in routers. It should not wrap functions which will be called by other controller functions
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
