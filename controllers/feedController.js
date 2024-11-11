// FIXME: I removed the catchAsync function from all methods that call services. Should add again somehow
const UserService = require('../services/userService');
const PostService = require('../services/postService');
const CollectionService = require('../services/collectionService');
const CommentService = require('../services/commentService');
const SharedService = require('../services/sharedService');

class feedController {
  #UserService = new UserService();

  #PostService = new PostService();

  #CollectionService = new CollectionService();

  #CommentService = new CommentService();

  #SharedService = new SharedService();

  #combineFeeds = (userFeed, genericFeed) => {
    // If a genericFeed was passed, get the totalCount from there. Else, from the userFeed
    const totalCounts = {
      posts: genericFeed?.totalCounts?.posts || userFeed?.totalCounts?.posts,
      collections:
        genericFeed?.totalCounts?.collections ||
        userFeed?.totalCounts?.collections,
      shareds:
        genericFeed?.totalCounts?.shareds || userFeed?.totalCounts?.shareds,
      comments:
        genericFeed?.totalCounts?.comments || userFeed?.totalCounts?.comments,
    };

    // Combine all documents (which will result in duplications)
    const combinedDocuments = [
      ...(userFeed?.limitedDocuments ?? []),
      ...(genericFeed?.limitedDocuments ?? []),
    ].sort((a, b) => b.postedAt - a.postedAt);

    // Use Map to de-duplicate
    const documentsMap = new Map();

    // Use doc._id.toString() as unique key. Must stringify because _id is a ObjectId object type
    combinedDocuments.forEach((doc) => {
      documentsMap.set(doc._id.toString(), doc);
    });

    const limitedDocuments = Array.from(documentsMap.values());

    const hasNextPage = userFeed?.hasNextPage || genericFeed?.hasNextPage;

    const nextPage = userFeed?.nextPage || genericFeed?.nextPage;

    return {
      totalCounts,
      limitedDocuments,
      hasNextPage,
      nextPage,
      count: limitedDocuments.length,
    };
  };

  getFeed = async (req, res) => {
    let userFeed;
    let genericFeed;

    if (req.user?.username) {
      userFeed = await this.#getUserFeed(req);
    }

    if (!req.user?.username || userFeed.limitedDocuments?.length < 20) {
      genericFeed = await this.#getGenericFeed(req);
    }

    const data = this.#combineFeeds(userFeed, genericFeed);

    res.status(200).json({
      status: 'Success',
      data,
    });
  };

  #getGenericFeed = async (req) => {
    const [posts, collections, comments, shareds] = await Promise.all([
      this.#PostService.getPosts(
        {
          status: 'posted',
        },
        req.query,
      ),
      this.#CollectionService.getCollections(
        {
          status: 'posted',
        },
        req.query,
      ),
      this.#CommentService.getCommentsAggregation(
        {
          status: 'posted',
        },
        req.query,
      ),
      this.#SharedService.getSharedsAggregation(
        {
          status: 'posted',
        },
        req.query,
      ),
    ]);

    // Combine all results and sort by 'postedAt'
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ].sort((a, b) => b.postedAt - a.postedAt);

    // Add counts for the response (totalCount for the total amount of documents in collection)
    const totalCounts = {
      comments: comments?.totalCount || 0,
      collections: collections?.totalCount || 0,
      posts: posts?.totalCount || 0,
      shareds: shareds?.totalCount || 0,
    };

    // Determine if there's a next page
    const hasNextPage =
      posts.hasNextPage ||
      collections.hasNextPage ||
      comments.hasNextPage ||
      shareds.hasNextPage;

    const nextPage = hasNextPage ? (req.query?.page || 1) + 1 : null;

    return { totalCounts, limitedDocuments, hasNextPage, nextPage };
  };

  // TODO: Estoy agregando Posts y Collections por fecha de publicación, no por fecha de actualización. Agregar esto es posible funcionalidad futura (no MVP). Tampoco estoy agregando replies a comments de gente que sigo: funcionalidad futura al cuadrado (no MVP al cudadrado)
  #getUserFeed = async (req) => {
    // Get the list of followed users
    const rawFollowing = await this.#UserService.getFullFollowingIds(
      req.user.username,
    );
    const following = rawFollowing?.[0]?.following;

    // Fetch recent posts, collections and comments by followed users
    const [posts, collections, comments, shareds] = await Promise.all([
      this.#PostService.getPosts(
        {
          author: { $in: following },
          status: 'posted',
        },
        req.query,
      ),
      this.#CollectionService.getCollections(
        {
          collector: { $in: following },
          status: 'posted',
        },
        req.query,
      ),
      this.#CommentService.getCommentsAggregation(
        {
          author: { $in: following },
          status: 'posted',
        },
        req.query,
      ),
      this.#SharedService.getSharedsAggregation(
        {
          sharer: { $in: following },
          status: 'posted',
        },
        req.query,
      ),
    ]);

    // Combine all results and sort by `postedAt`
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ].sort((a, b) => b.postedAt - a.postedAt);

    // Add counts for the response (totalCount for the total amount of documents in collection and actualCount for total amount of documents in the response)
    const totalCounts = {
      comments: comments?.totalCount || 0,
      collections: collections?.totalCount || 0,
      posts: posts?.totalCount || 0,
      shareds: shareds?.totalCount || 0,
    };

    // Determine if there's a next page
    const hasNextPage =
      posts.hasNextPage ||
      collections.hasNextPage ||
      comments.hasNextPage ||
      shareds.hasNextPage;

    const nextPage = hasNextPage ? (req.query?.page || 1) + 1 : null;

    return { totalCounts, limitedDocuments, hasNextPage, nextPage };
  };
}

module.exports = feedController;
