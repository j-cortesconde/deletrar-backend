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
    const totalCount = {
      posts: genericFeed?.totalCount?.posts || userFeed?.totalCount?.posts,
      collections:
        genericFeed?.totalCount?.collections ||
        userFeed?.totalCount?.collections,
      shareds:
        genericFeed?.totalCount?.shareds || userFeed?.totalCount?.shareds,
      comments:
        genericFeed?.totalCount?.comments || userFeed?.totalCount?.comments,
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

    return {
      totalCount,
      limitedDocuments,
      count: limitedDocuments.length,
    };
  };

  // TODO: Falta agregar funcionalidad de paginación
  getFeed = async (req, res) => {
    let userFeed;
    let genericFeed;

    if (req.user?.username) {
      userFeed = await this.#getUserFeed(req);
    }

    if (!req.user?.username || userFeed.limitedDocuments?.length < 20) {
      genericFeed = await this.#getGenericFeed();
    }

    const data = this.#combineFeeds(userFeed, genericFeed);

    res.status(200).json({
      status: 'Success',
      data,
    });
  };

  #getGenericFeed = async () => {
    const rawPosts = await this.#PostService.getPosts({
      status: 'posted',
    });
    const posts = {
      totalCount: rawPosts?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawPosts?.[0]?.limitedDocuments,
    };

    const rawCollections = await this.#CollectionService.getCollections({
      status: 'posted',
    });
    const collections = {
      totalCount: rawCollections?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawCollections?.[0]?.limitedDocuments,
    };

    const rawComments = await this.#CommentService.getCommentsAggregation({
      status: 'posted',
    });
    const comments = {
      totalCount: rawComments?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawComments?.[0]?.limitedDocuments,
    };

    const rawShareds = await this.#SharedService.getSharedsAggregation({
      status: 'posted',
    });
    const shareds = {
      totalCount: rawShareds?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawShareds?.[0]?.limitedDocuments,
    };

    // Add counts for the response (totalCount for the total amount of documents in collection and actualCount for total amount of documents in the response)
    const totalCount = {
      comments: comments?.totalCount || 0,
      collections: collections?.totalCount || 0,
      posts: posts?.totalCount || 0,
      shareds: shareds?.totalCount || 0,
    };

    // Combine all results and sort by `postedAt`
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ];

    return { totalCount, limitedDocuments };
  };

  // TODO: Estoy agregando Posts y Collections por fecha de publicación, no por fecha de actualización. Agregar esto es posible funcionalidad futura (no MVP). Tampoco estoy agregando replies a comments de gente que sigo: funcionalidad futura al cuadrado (no MVP al cudadrado)
  #getUserFeed = async (req) => {
    // Get the list of followed users
    const rawFollowing = await this.#UserService.getFullFollowingIds(
      req.user.username,
    );
    const following = rawFollowing?.[0]?.following;

    // Fetch recent posts and collections by followed users
    const rawPosts = await this.#PostService.getPosts({
      author: { $in: following },
      status: 'posted',
    });
    const posts = {
      totalCount: rawPosts?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawPosts?.[0]?.limitedDocuments,
    };

    const rawCollections = await this.#CollectionService.getCollections({
      collector: { $in: following },
      status: 'posted',
    });
    const collections = {
      totalCount: rawCollections?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawCollections?.[0]?.limitedDocuments,
    };

    const rawComments = await this.#CommentService.getCommentsAggregation({
      author: { $in: following },
      status: 'posted',
    });
    const comments = {
      totalCount: rawComments?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawComments?.[0]?.limitedDocuments,
    };

    const rawShareds = await this.#SharedService.getSharedsAggregation({
      sharer: { $in: following },
      status: 'posted',
    });

    const shareds = {
      totalCount: rawShareds?.[0]?.totalCount?.[0]?.totalCount,
      limitedDocuments: rawShareds?.[0]?.limitedDocuments,
    };

    // Add counts for the response (totalCount for the total amount of documents in collection and actualCount for total amount of documents in the response)
    const totalCount = {
      comments: comments?.totalCount || 0,
      collections: collections?.totalCount || 0,
      posts: posts?.totalCount || 0,
      shareds: shareds?.totalCount || 0,
    };

    // Combine all results and sort by `postedAt`
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ].sort((a, b) => b.postedAt - a.postedAt);

    return { totalCount, limitedDocuments };
  };
}

module.exports = feedController;
