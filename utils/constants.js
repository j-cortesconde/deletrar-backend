exports.ADMIN = {
  name: 'Joaquín Cortés Conde',
  email: 'jcortesconde@gmail.com',
};

// I believe this is the limit for searches
exports.QUERY_LIMIT = 100;

// This is the limit for posts/collections displayed on a users profile
// IMPORTANT. This must only be changed in accordance to the change of the PAGE_SIZE constant in frontend
exports.AGGREGATION_LIMIT = 10;

// This is the limit for comments displayed under a post/collection/comment
// IMPORTANT. This must only be changed in accordance to the change of the COMMENT_PAGE_AMOUNT constant in frontend
exports.COMMENT_LIMIT = 10;

// This is the limit for shared documents displayed
// TODO: THIS FUNCTIONALITY HASNT YET BEEN IMPLEMENTED -> IMPORTANT. This must only be changed in accordance to the change of the SHARED_PAGE_AMOUNT constant in frontend
exports.SHARED_LIMIT = 30;

// This is the limit for conversations displayed
// IMPORTANT. This must only be changed in accordance to the change of its given constant(NONE YET) in frontend
exports.CONVERSATION_LIMIT = 10;

exports.FRONTEND_ADDRESS = 'http://localhost:5173';
