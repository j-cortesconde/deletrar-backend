// TODO: Isnt there a better way to handle text versions by creating multiple documents that point to the initial doc instead of saving each version in a field?

const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObj');
const PostService = require('../services/postService');

class PostController {
  #PostService = new PostService();

  // Function that creates posts filtering out of the creating object the fields the user isnt allowed to enter
  createPost = async (req, res, next) => {
    const filteredBody = filterObj(
      req.body,
      'title',
      'summary',
      'status',
      'settings',
    );
    if (req.body.content) filteredBody.content = JSON.parse(req.body.content);
    filteredBody.author = req.user.username;
    filteredBody.currentVersion = 1;
    filteredBody.updatedAt = Date.now();
    if (filteredBody.status === 'posted') filteredBody.postedAt = Date.now();
    if (req.file) filteredBody.coverImage = req.file.filename;

    const doc = await this.#PostService.createPost(filteredBody);

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  };

  // Updates the post limiting the fields that can be updated, adding update time, counting number of versions (posted versions) and adding the document's previous state as a string to its previousVersion field (if both previous and new version are posted versions).
  updatePost = async (req, res, next) => {
    const populate = [
      {
        path: 'author',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
    ];

    const oldDoc = await this.#PostService.getPost(req.params.id, {
      populate,
    });

    if (!oldDoc) {
      return next(new AppError('No se encontró ese texto.', 404));
    }

    if (oldDoc.author.id !== req.user.id) {
      return next(
        new AppError(
          'No sos propietario del texto que estás intentando modificar.',
          400,
        ),
      );
    }

    const filteredBody = filterObj(
      req.body,
      'title',
      'summary',
      'status',
      'settings',
    );
    if (req.body.content) filteredBody.content = JSON.parse(req.body.content);

    if (Object.keys(filteredBody).length === 0) {
      return next(
        new AppError(
          'Ninguno de los campos que estás intentando modificar es válido.',
          400,
        ),
      );
    }

    if (filteredBody.status === 'posted' && !oldDoc.postedAt)
      filteredBody.postedAt = Date.now();

    if (oldDoc.status === 'posted') {
      filteredBody.previousVersion = JSON.stringify(oldDoc.toObject());
      filteredBody.currentVersion = oldDoc.currentVersion + 1;
    }
    if (req.file) filteredBody.coverImage = req.file.filename;
    filteredBody.updatedAt = Date.now();

    const doc = await this.#PostService.updatePost(
      { _id: req.params.id },
      filteredBody,
      {
        new: true,
        runValidators: true,
        populate,
      },
    );

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  //Looks for a document's previous version. If no version number is specified in GET, the immediate previous is sent. Else, that which was specified.
  getPreviousVersion = async (req, res, next) => {
    const populate = [
      {
        path: 'author',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
    ];

    const doc = await this.#PostService.getPost(req.params.id, { populate });

    if (!doc) {
      return next(new AppError('No se encontró ese texto.', 404));
    }

    if (!doc.previousVersion) {
      return next(new AppError('Este texto no tiene versiones previas.', 400));
    }

    // If no version was specified in params, the immediate previous is chosen
    const version = Number(req.params.version) || doc.currentVersion - 1;

    if (version > doc.currentVersion - 1 || version < 1) {
      return next(
        new AppError(
          `Elegí un número de versión previa que se encuentre entre ${doc.currentVersion - 1} y 1`,
          400,
        ),
      );
    }

    // The immediate previous version is produced
    let oldVersion = JSON.parse(doc.previousVersion);

    // If any version previous to the immedate previous version is required, then this loop searches for it until it gets to it.
    try {
      for (let i = doc.currentVersion - 1; i > version; i -= 1) {
        oldVersion = JSON.parse(oldVersion.previousVersion);
      }
    } catch (err) {
      // Redundancy error. Shouldn't occur if the rest of the code is working without bugs
      return next(
        new AppError(
          'Parece que elegiste un número inválido de versión previa.',
          400,
        ),
      );
    }

    res.status(200).json({
      status: 'success',
      data: oldVersion,
    });
  };

  // Only returns status="posted" posts
  getAllPosts = async (req, res, next) => {
    req.query.status = 'posted';

    const docs = await this.#PostService.getAllPosts(req.query, '-settings');

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };

  // Only returns status="posted" posts
  getPostsByAuthorUsername = async (req, res, next) => {
    const data = await this.#PostService.getPosts(
      { author: req.params.username, status: 'posted' },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  };

  // Returns posts where status isn't "posted"
  getOwnHidenPosts = async (req, res, next) => {
    const data = await this.#PostService.getPosts(
      { author: req.user.username, status: { $ne: 'posted' } },
      req.query,
    );

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      data,
    });
  };

  // TODO: I could add a setting to posts where one could set post visibility (specific users that could see other users editing posts, private posted posts, etc) and add that logic here
  getPostById = async (req, res, next) => {
    const populate = [
      {
        path: 'author',
        model: 'User',
        select: 'name photo username',
        foreignField: 'username',
      },
    ];
    const doc = await this.#PostService.getPost(req.params.id, { populate });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No se encontró ningún texto con ese ID.',
      });
    }

    if (doc.status !== 'posted' && doc.author.id !== req.user.id) {
      return res.status(401).json({
        status: 'fail',
        message: 'No tiene autorización para acceder a este texto.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  };

  adminDeletePost = async (req, res, next) => {
    const doc = await this.#PostService.deletePost(req.params.id);

    if (!doc) {
      return next(new AppError('No se encontró ese texto.', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };

  searchPosts = async (req, res, next) => {
    const docs = await this.#PostService.searchPosts(req.params.searchTerm);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: docs,
    });
  };
}

module.exports = PostController;
