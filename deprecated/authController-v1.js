const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const { ADMIN } = require('../utils/constants');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

//Creates a jwt and sends it (as cookie and in the response)
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
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
    data: {
      user,
    },
  });
};

// Highly complex method that handles foreign user's account request (to admins or users) and that contemplates the account already existing (in any role)
exports.requestInvite = catchAsync(async (req, res, next) => {
  const homepageURL = `${req.protocol}://${req.get('host')}/home`;
  // A) Validate all fields have been sent. toWhom = {isUser=boolean, username}
  if (
    !req.body.email ||
    !req.body.name ||
    !req.body.request ||
    !req.body.toWhom
  )
    return next(
      new AppError('Request must include email, name, request and toWhom', 401),
    );

  // B) Check if user already exists. If so, mail them informing them of their account status
  const existingRequestorUser = await User.findOne({ email: req.body.email });
  if (existingRequestorUser) {
    try {
      const forgotPasswordURL = `${req.protocol}://${req.get(
        'host',
      )}/api/v1/users/forgotPassword`;

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
        message: "Check your invoice to follow your request's status",
      });
    } catch (err) {
      return next(
        new AppError(
          'There was an error sending the email with instructions. Try again later!',
          500,
        ),
      );
    }
  }

  // C) If the account invitation was requested to a user
  if (req.body.toWhom.isUser) {
    const requestedUser = await User.findOne({
      username: req.body.toWhom.username,
    });

    // C-I) Check user exists and is receiving invitations
    if (requestedUser?.settings.receivingInvitationRequests) {
      try {
        // Create a 'requestor' type user
        //FIXME: Change to random password
        const password = `${req.body.email}${Date.now()}`;
        const newUser = await User.create({
          name: req.body.name,
          email: req.body.email,
          role: 'requestor',
          notes: [`Invite Request: ${req.body.request}`],
          username: req.body.email,
          password,
          passwordConfirm: password,
        });

        const inviteURL = `${req.protocol}://${req.get(
          'host',
        )}/api/v1/users/invite`;

        // Email requester and requested users
        await new Email(requestedUser, inviteURL).sendAccountRequestReceived(
          req.body.request,
          newUser,
        );
        await new Email(newUser, homepageURL).sendAccountRequestSent();

        return res.status(200).json({
          status: 'success',
          message: "Check your invoice to follow your request's status",
        });
      } catch (err) {
        return next(
          new AppError(
            'There was an error sending the request email. Please try again later!',
            500,
          ),
        );
      }

      // C-II) Handle if user doesn't exist or isn't receiving requests
    } else if (!requestedUser?.settings.receivingInvitationRequests) {
      return res.status(400).json({
        status: 'fail',
        message:
          "The user specified does not exist or isn't receiving access requests at the moment",
      });
    }
  }

  // D) If the account invitation was requested to an admin
  if (!req.body.toWhom.isUser) {
    try {
      // Create a 'requestor' type user
      //FIXME: Change to random password
      const password = `${req.body.email}${Date.now()}`;
      const newUser = await User.create({
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
        message: "Check your invoice to follow your request's status",
      });
    } catch (err) {
      return next(
        new AppError(
          'There was an error sending the request email. Please try again later!',
          500,
        ),
      );
    }
  }
});

// Inviting a friend you only pass in their name and email. System creates random password and user is forced to reset it. Handles cases where user already has account (or has already received an invite)
exports.invite = catchAsync(async (req, res, next) => {
  // 1) Checks if user already exists.
  let user = await User.findOne({ email: req.body.email });

  // I- If user is inactive
  if (!user?.active) {
    res.status(401).json({
      status: 'fail',
      message:
        'User already had an account and deleted it. If they want to recover it they should head to /recover',
    });
  }
  // II- If exists as invitee,
  if (user?.role === 'invitee') {
    res.status(401).json({
      status: 'fail',
      message:
        'User has already received an invitation. They should try logging into their account or reset their account password',
    });
  }
  // III- If exists as initalized user,
  if (user?.role === 'user' || user?.role === 'admin') {
    res.status(401).json({
      status: 'fail',
      message:
        'User already has an account. If they forgot their password, they should try to reset it',
    });
  }
  // IV- If exists as requestor, turns it to an invitee. Else, continues.
  if (user?.role === 'requestor') {
    user.role = 'invitee';
    await user.save({ validateBeforeSave: false });
  }

  // V) If doesn't already exist, create one with a random password and a throwaway username (the user's email address)
  if (!user) {
    //FIXME: Change to random password
    const password = `${req.body.email}${Date.now()}`;
    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      username: req.body.email,
      password,
      passwordConfirm: password,
    });
  }

  // 2) Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Sends a welcome email to the user's email (including the pw reset token link)
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendWelcome();

    res.status(200).json({
      status: 'success',
      message: 'User has recieved an invitation email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Checks the user is logged in and if pw hasn't changed sin jwt emission. If so, nexts, if not, errors.
// Adds the user document from the User model to  req.user
exports.protect = catchAsync(async (req, res, next) => {
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
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id, '+active', {
    includeInactive: true,
  });
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401,
      ),
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Checks the user is initialized (isn't invitee). If so, nexts, if not, errors and prompts to initialize.
exports.isInitialized = (req, res, next) => {
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
exports.isActive = (req, res, next) => {
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
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
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
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles=['admin', 'user'] includes req.user.role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };

// User posts mail in req body, if belong to db user, gets a reset link on mail
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

// Checks if the reset token on the url corresponds to a user's (and isnt outdated). If so, resets all passwordReset fields on the user and accepts the password and resetpassword into the user document (and creates and sends the jwt so user is logged in)
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user with that resetToken, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) changedPasswordAt property for the user gets auto updated as per Model's pre-save MW
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

// For logged in users. If the currentPw they pass in in body is correct, updates it from body too (pw & pwconfirm)
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
