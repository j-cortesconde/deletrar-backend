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

  // TODO: Estoy agregando Posts y Collections por fecha de publicación, no por fecha de actualización. Agregar esto es posible funcionalidad futura (no MVP). Tampoco estoy agregando replies a comments de gente que sigo: funcionalidad futura al cuadrado (no MVP al cudadrado)
  // TODO: MVP, agregar funcionalidad para que traiga un feed universal para users sin loggear y sin following
  getUserFeed = async (req, res) => {
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
    const actualCount = {
      posts: posts?.limitedDocuments.length,
      collections: collections?.limitedDocuments.length,
      comments: comments?.limitedDocuments.length,
      shareds: shareds?.limitedDocuments.length,
    };

    // Combine all results and sort by `postedAt`
    const limitedDocuments = [
      ...posts.limitedDocuments,
      ...collections.limitedDocuments,
      ...comments.limitedDocuments,
      ...shareds.limitedDocuments,
    ].sort((a, b) => b.postedAt - a.postedAt);

    res.status(200).json({
      status: 'success',
      data: {
        count: { totalCount, actualCount },
        limitedDocuments,
      },
    });
  };
}

module.exports = feedController;
