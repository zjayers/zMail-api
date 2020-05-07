/* eslint-disable func-names */
/* eslint-disable consistent-return */
/* eslint-disable max-len */
// IMPORT MODULES
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// CREATE USER SCHEMA
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'A password must have greater or equal to 8 characters'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        //! THIS VALIDATOR ONLY RUNS ON .CREATE() OR .SAVE()
        validator(el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    passwordChangedAt: { type: Date },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: { type: Boolean, default: true, select: false },
  },
  {
    // Option to output virtual properties from schema
    // !NOTE: THESE VIRTUAL PROPERTIES CANNOT BE QUERIED
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);


//! PASSWORD ENCRYPTION MIDDLEWARE
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only run this function if the password has been modified
  this.password = await bcrypt.hash(this.password, 12); // <- 12 is the CPU cost of hashing
  this.passwordConfirm = undefined; // Remove the password confirm from the database - it is only needed for initial validation
  next();
});

//! 'PASSWORD UPDATED AT' MIDDLEWARE
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // Subtract 1 second from the date.now to ensure the JWT Token is created after the password is changed
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//! HIDE INACTIVE USER MIDDLEWARE
userSchema.pre(/^find/, function (next) {
  // Only include active users
  this.find({ active: { $ne: false } });
  next();
});

//* PASSWORD LOGIN COMPARISON
userSchema.methods.correctPassword = async (
  candidatePassword,
  userPassword,
) => {
  const passwordsMatch = await bcrypt.compare(candidatePassword, userPassword);
  return passwordsMatch;
};

//* PASSWORD CHANGED MONITOR
userSchema.methods.changedPasswordAfter = (JWTTimestamp) => {
  // If password has ever been changed - check it against the JWT timestamp
  if (this.passwordChangedAt) {
    // Convert the date to milliseconds, then seconds, then to an integer
    const convertedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    // If token was issued before the password changed, return false
    return JWTTimestamp < convertedTimestamp;
  }

  return false;
};

//* PASSWORD RESET TOKEN GENERATOR
userSchema.methods.createPasswordResetToken = () => {
  // Create random hex string to send to user as reset password
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash the reset token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set the token expiry for 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // return the un-encrypted token - encrypted version will be kept in database
  return resetToken;
};

// CREATE EXPORT MODEL
const User = mongoose.model('User', userSchema);

// EXPORT THIS MODULE
module.exports = User;
