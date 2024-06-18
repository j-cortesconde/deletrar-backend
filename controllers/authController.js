// FIXME: Handle the case of catchAsync
// FIXME: Move to a MW folder&file protect, isInitialized, isActive and restrictTo
// FIXME: Coudln't adding the logged in user to req.user (what the auth mw does) be falsified?
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const UserService = require('../services/userService');

const { ADMIN, FRONTEND_ADDRESS } = require('../utils/constants');

class AuthController {
  #service = new UserService();

  #signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

  //TODO: Check user.password in this method when logging in. Might not need the undefined to remove it from output
  //Creates a jwt and sends it (as cookie and in the response)
  #createSendToken = (user, statusCode, res) => {
    const token = this.#signToken(user._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
      httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
      status: 'success',
      token,
      data: user,
    });
  };

  // TODO: Not handling cases in which the decoding fails for bad token
  getTokenUser = async (token) => {
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const select = '+active';
    const includeInactive = true;
    const currentUser = await this.#service.getUserById(decoded.id, {
      select,
      includeInactive,
    });

    if (!currentUser) {
      return {
        error: 'The user belonging to this token does no longer exist.',
      };
    }

    // 4) Check if user changed password after the token was issued
    if (this.#service.changedPasswordAfter(currentUser, decoded.iat)) {
      return {
        error: 'User recently changed password! Please log in again.',
      };
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    return currentUser;
  };

  // Highly complex method that handles foreign user's account request (to admins or users) and that contemplates the account already existing (in any role)
  requestInvite = catchAsync(async (req, res, next) => {
    const homepageURL = `${FRONTEND_ADDRESS}/home`;
    // A) Validate all fields have been sent. toWhom = {isUser=boolean, username}
    if (
      !req.body.email ||
      !req.body.name ||
      !req.body.request ||
      !req.body.toWhom
    )
      return next(
        new AppError(
          'La solicitud tiene que incluir un correo, un nombre y un destinatario.',
          401,
        ),
      );

    // B) Check if user already exists. If so, mail them informing them of their account status
    const existingRequestorUser = await this.#service.findOneUser({
      email: req.body.email,
    });
    if (existingRequestorUser) {
      try {
        const forgotPasswordURL = `${FRONTEND_ADDRESS}/password/forgot`;

        if (existingRequestorUser.role === 'user') {
          await new Email(
            existingRequestorUser,
            forgotPasswordURL,
          ).sendAccountRequestUser();
        }
        if (existingRequestorUser.role === 'invitee') {
          await new Email(
            existingRequestorUser,
            forgotPasswordURL,
          ).sendAccountRequestInvitee();
        }
        //TODO: Add an url to redirect the user to the homepage
        if (existingRequestorUser.role === 'requestor') {
          await new Email(
            existingRequestorUser,
            homepageURL,
          ).sendAccountRequestRequestor();
        }

        return res.status(200).json({
          status: 'success',
          message:
            'Revisa la bandeja de entrada de tu correo para saber cómo sigue tu solicitud.',
        });
      } catch (err) {
        return next(
          new AppError(
            'Hubo un problema enviando el correo electrónico con instrucciones. ¡Volvé a intentarlo más tarde!',
            500,
          ),
        );
      }
    }

    // C) If the account invitation was requested to a user
    if (req.body.toWhom.isUser) {
      const requestedUser = await this.#service.findOneUser({
        username: req.body.toWhom.username,
      });

      // C-I) Check user exists and is receiving invitations
      if (requestedUser?.settings.receivingInvitationRequests) {
        try {
          // Create a 'requestor' type user
          //FIXME: Change to random password
          const password = `${req.body.email}${Date.now()}`;
          const newUser = await this.#service.createUser({
            name: req.body.name,
            email: req.body.email,
            role: 'requestor',
            notes: [`Invite Request: ${req.body.request}`],
            username: req.body.email,
            password,
            passwordConfirm: password,
          });

          const inviteURL = `${FRONTEND_ADDRESS}/users/invite?email=${req.body.email}`;

          // Email requester and requested users
          await new Email(requestedUser, inviteURL).sendAccountRequestReceived(
            req.body.request,
            newUser,
          );
          await new Email(newUser, homepageURL).sendAccountRequestSent();

          return res.status(200).json({
            status: 'success',
            message:
              'Revisa la bandeja de entrada de tu correo para saber cómo sigue tu solicitud.',
          });
        } catch (err) {
          return next(
            new AppError(
              'Hubo un problema enviando el correo electrónico con instrucciones. ¡Volvé a intentarlo más tarde!',
              500,
            ),
          );
        }

        // C-II) Handle if user doesn't exist or isn't receiving requests
      } else if (!requestedUser?.settings.receivingInvitationRequests) {
        return res.status(400).json({
          status: 'fail',
          message:
            'El usuario indicado no existe o no está recibiendo solicitudes de invitación.',
        });
      }
    }

    // D) If the account invitation was requested to an admin
    if (!req.body.toWhom.isUser) {
      try {
        // Create a 'requestor' type user
        //FIXME: Change to random password
        const password = `${req.body.email}${Date.now()}`;
        const newUser = await this.#service.createUser({
          name: req.body.name,
          email: req.body.email,
          role: 'requestor',
          notes: [req.body.request],
          username: req.body.email,
          password,
          passwordConfirm: password,
        });

        const requestorURL = `${req.protocol}://${req.get(
          'host',
        )}/api/v1/users/${newUser._id}`;

        // Email admin and requester user
        await new Email(ADMIN, requestorURL).sendAccountRequestAdmin(
          req.body.request,
          newUser,
        );

        await new Email(newUser, homepageURL).sendAccountRequestSent();

        return res.status(200).json({
          status: 'success',
          message:
            'Revisa la bandeja de entrada de tu correo para saber cómo sigue tu solicitud.',
        });
      } catch (err) {
        return next(
          new AppError(
            'Hubo un problema enviando el correo electrónico con instrucciones. ¡Volvé a intentarlo más tarde!',
            500,
          ),
        );
      }
    }
  });

  // Inviting a friend you only pass in their name and email. System creates random password and user is forced to reset it. Handles cases where user already has account (or has already received an invite)
  invite = catchAsync(async (req, res, next) => {
    // 1) Checks if user already exists.
    let user = await this.#service.findOneUser(
      { email: req.body.email },
      { select: '+active', includeInactive: true },
    );

    // I- If user is inactive
    if (user && !user?.active) {
      return res.status(401).json({
        status: 'fail',
        message:
          'El usuario tenía una cuenta y la eliminó. Si quiere recuperarla, puede intentar iniciando sesión o reiniciando su contraseña.',
      });
    }
    // II- If exists as invitee,
    if (user?.role === 'invitee') {
      return res.status(401).json({
        status: 'fail',
        message:
          'El usuario ya recibió otra invitación. Puede activar su cuenta iniciando sesión o reiniciando su contraseña.',
      });
    }
    // III- If exists as initalized user,
    if (user?.role === 'user' || user?.role === 'admin') {
      return res.status(401).json({
        status: 'fail',
        message:
          'El usuario ya tiene una cuenta. Si olvidó su contraseña, tiene que intentar reiniciarla',
      });
    }
    // IV- If exists as requestor, turns it to an invitee. Else, continues.
    if (user?.role === 'requestor') {
      await this.#service.setInvitee(user);
    }

    // V) If doesn't already exist, create one with a random password and a throwaway username (the user's email address)
    if (!user) {
      //FIXME: Change to random password
      const password = `${req.body.email}${Date.now()}`;
      user = await this.#service.createUser({
        name: req.body.name,
        email: req.body.email,
        username: req.body.email,
        password,
        passwordConfirm: password,
      });
    }

    // 2) Generate and get a random reset token
    const resetToken = await this.#service.createPasswordResetToken(user);

    // 3) Sends a welcome email to the user's email (including the pw reset token link)
    try {
      const resetURL = `${FRONTEND_ADDRESS}/password/reset/${resetToken}`;
      await new Email(user, resetURL).sendWelcome();

      res.status(200).json({
        status: 'success',
        message: 'El usuario recibirá una invitación en su correo electrónico.',
      });
    } catch (err) {
      await this.#service.clearResetToken(user);

      return next(
        new AppError(
          'Hubo un problema enviando el correo electrónico con instrucciones. ¡Volvé a intentarlo más tarde!',
          500,
        ),
      );
    }
  });

  login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Get user associated with that email address
    const select =
      'name username email photo description createdAt role settings active';

    const user = await this.#service.findOneUser(
      { email },
      { select, includeInactive: true },
    );
    // 3) Check password is correct
    if (!(await this.#service.isPasswordCorrect(user, password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 4) If everything ok, send token to client
    this.#createSendToken(user, 200, res);
  });

  logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json({ status: 'success' });
  };

  // Checks the user is logged in and if pw hasn't changed sin jwt emission. If so, adds it to req.user, if not, adds the error the protect method should return. In any case it nexts.
  // Adds the user document from the User model to  req.user
  getLoggedInUser = async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      req.user = {
        error: 'You are not logged in! Please log in to get access.',
      };
      return next();
    }

    // Calls a private method that gets and returns the user for that given token (or returns an object with an error key if no valid users were found so that the 'protect' method stops it)
    req.user = await this.getTokenUser(token);
    next();
  };

  // IMPORTANT: This MW  must work in tandem with the getLoggedInUser MW
  // If the user is logged in, it gets it from getLoggedInUser in req.user. If user isnt logged in (or their login is invalid), gets instead an error message in req.user.error. In the first case it nexts, in the second case it returns the error.
  protect = catchAsync(async (req, res, next) => {
    // 1) REDUNDANCY. If nothing was passed in req.user, returns a generic error
    if (!req.user) {
      return next(new AppError('There was an unexpected issue', 500));
    }

    // 2) Checks if there is a user error message in req.user.error
    if (req.user.error) {
      return next(new AppError(req.user.error, 401));
    }

    // 3) GRANT ACCESS TO PROTECTED ROUTE
    next();
  });

  // Checks the user is initialized (isn't invitee). If so, nexts, if not, errors and prompts to initialize.
  isInitialized = (req, res, next) => {
    if (req.user.role === 'invitee') {
      const initializeURL = `${req.protocol}://${req.get(
        'host',
      )}/api/v1/users/initializeMe`;
      return next(
        new AppError(
          `User isnt yet initialized. Please do so by patching a username request at ${initializeURL}`,
          401,
        ),
      );
    }
    next();
  };

  // TODO: @frontend must redirect inactive users to /reactivateMe (workaround in backend by isActive mw)
  // Checks the user account is active. If so, nexts, if not, errors and prompts to reactivate.
  isActive = (req, res, next) => {
    if (!req.user.active) {
      const reactivateURL = `${req.protocol}://${req.get(
        'host',
      )}/api/v1/users/reactivateMe`;
      return next(
        new AppError(
          `User has been deactivated. Please reactivate it by sending a GET request to ${reactivateURL}`,
          401,
        ),
      );
    }
    next();
  };

  // FIXME: Check use cases: (seems to be for view renders). Ill do it in React on a different dir. Old message: Only for rendered pages, no errors!
  isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
      try {
        // 1) verify token
        const decoded = await promisify(jwt.verify)(
          req.cookies.jwt,
          process.env.JWT_SECRET,
        );

        // 2) Check if user still exists
        const currentUser = await this.#service.getUserById(decoded.id);
        if (!currentUser) {
          return next();
        }

        // 3) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
          return next();
        }

        // THERE IS A LOGGED IN USER
        res.locals.user = currentUser;
        return next();
      } catch (err) {
        return next();
      }
    }
    next();
  };

  // Takes an unkown quantity of strings, arrays them and checks if the current logged in user's role is one of those specified roles. Nexts if so, errors if not.
  restrictTo =
    (...roles) =>
    (req, res, next) => {
      // roles=['admin', 'user'] includes req.user.role='user'
      if (!roles.includes(req.user.role)) {
        return next(
          new AppError(
            'You do not have permission to perform this action',
            403,
          ),
        );
      }

      next();
    };

  // User posts mail in req body, if belong to db user, gets a reset link on mail
  forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await this.#service.findOneUser({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        // FIXME: Quiero abrir esta vulnerabilidad? Tiene sentido evitarla?
        message:
          'No se encontró ningún usuario asociado a esa dirección de correo electrónico.',
      });
    }

    // 2) Generate the random reset token
    const resetToken = await this.#service.createPasswordResetToken(user);

    // 3) Send it to user's email
    try {
      const resetURL = `${FRONTEND_ADDRESS}/password/reset/${resetToken}`;
      await new Email(user, resetURL).sendPasswordReset();

      res.status(200).json({
        status: 'success',
        message:
          'Se enviaron instrucciones para reiniciar tu contraseña a tu correo electrónico.',
      });
    } catch (err) {
      await this.#service.clearPasswordResetToken(user);

      return next(
        new AppError(
          'Hubo un problema enviando el correo electrónico con instrucciones. ¡Volvé a intentarlo más tarde!',
          500,
        ),
      );
    }
  });

  // Checks if the reset token on the url corresponds to a user's (and isnt outdated). If so, resets all passwordReset fields on the user and accepts the password and resetpassword into the user document (and creates and sends the jwt so user is logged in)
  resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await this.#service.findOneUser({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user with that resetToken, set the new password
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message:
          // TODO: Update this link
          'Este link de reinicio es invalido o ha expirado. Generá uno nuevo desde /password/forgot',
      });
    }

    const { password, passwordConfirm } = req.body;
    await this.#service.setPassword(user, { password, passwordConfirm });
    await this.#service.clearPasswordResetToken(user);
    // 3) changedPasswordAt property for the user gets auto updated as per Model's pre-save MW
    // 4) Log the user in, send JWT
    this.#createSendToken(user, 200, res);
  });

  // For logged in users. If the currentPw they pass in in body is correct, updates it from body too (pw & pwconfirm)
  updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await this.#service.getUserById(req.user.id);

    // 2) Check if POSTed current password is correct
    if (
      !(await this.#service.isPasswordCorrect(user, req.body.passwordCurrent))
    ) {
      return next(
        new AppError(
          'The value you entered for passwordCurrent is wrong.',
          401,
        ),
      );
    }

    // 3) If so, update password
    const { password, passwordConfirm } = req.body;
    await this.#service.setPassword(user, { password, passwordConfirm });
    await this.#service.clearPasswordResetToken(user);
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    this.#createSendToken(user, 200, res);
  });
}

module.exports = AuthController;
