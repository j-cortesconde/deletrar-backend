const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A user must have a name'],
      trim: true,
      maxlength: [40, 'A user name must have less or equal to 40 characters'],
    },
    // TODO: We must add three functionalities: 1) username be marked as used before waiting for the request send. 2) username not be allowed to be updated. 3) Force the user to create a username when activating the profile (passing it from invitee to user)
    username: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    description: {
      type: String,
      trim: true,
    },
    following: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    role: {
      type: String,
      enum: ['requestor', 'invitee', 'user', 'admin'],
      default: 'invitee',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    //TODO: Settings still to do:
    settings: {
      receivingInvitationRequests: {
        type: Boolean,
        default: true,
      },
    },
    notes: {
      type: [String],
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//
userSchema.virtual('posts', {
  ref: 'Post',
  foreignField: 'author',
  localField: '_id',
  select: 'title',
});

userSchema.virtual('followers', {
  ref: 'User',
  foreignField: 'following',
  localField: '_id',
  select: 'name',
});

// Encrypt password on password create/change
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt field
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Remove inactive users from user queries (unless includeInactive=true is specified in query options)
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  if (!this.options.includeInactive) this.find({ active: { $ne: false } });
  next();
});

// Checks that two given passwords, the first flat, the second hashed, are the same
userSchema.methods.correctPassword = async function (candidatePassword) {
  const user = await this.constructor
    .findById(this._id, null, { includeInactive: true })
    .select('+password');

  return await bcrypt.compare(candidatePassword, user.password);
};

// Checks whether JWToken is outdated because the password has been changed since its emission (true if outdated)
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Creates and returns a unique encrypted token that will be sent by email and will be used as ownership validation for password reset
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
