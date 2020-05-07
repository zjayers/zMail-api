/* eslint-disable consistent-return */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// *JWT TOKEN SIGNER
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});

// *JWT TOKEN SENDER
const createSendToken = (user, statusCode, req, res) => {
  //* Log the new user in as soon as they sign up
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, // Convert to milliseconds
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from the output
  user.password = undefined;
  //* Send the token to the user
  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

//* SIGNUP METHOD
exports.signup = catchAsync(async (req, res) => {
  //! Only allow data needed from user
  const newUser = await User.create({
    name: req.body.name,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Send the JWT Token
  createSendToken(newUser, 201, req, res);
});

//* LOGIN METHOD
exports.login = catchAsync(async (req, res, next) => {
  // Get the username and password credentials
  const { name, password } = req.body;

  // - Check if username and password exist
  if (!name || !password) return next(new AppError('Please provide both username and password!', 400));

  // - Check if the user exists in the database && if the password is correct
  const user = await User.findOne({ name }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect username or password!', 401));
  }

  // Send the JWT Token
  createSendToken(user, 200, req, res);
});

//* LOGOUT METHOD
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

//! PROTECTED ROUTE MIDDLEWARE
exports.protect = catchAsync(async (req, res, next) => {
  // Get the token from the user
  let token;

  // Check if there are headers in the request, and if the token exists with template 'Bearer <token>'
  if (
    req.headers.authorization
    && req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // Verify the token is authentic - promisify the verify process so it can be awaited
  const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if the user still exists in database
  const currentUser = await User.findById(payload.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401),
    );
  }

  // Check if the user has changed password after the token was issued
  if (currentUser.changedPasswordAfter(payload.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // Add user data to the request to use in next middleware function
  req.user = currentUser;
  // MAKE USER ACCESSIBLE TO PUG TEMPLATES
  res.locals.user = currentUser;
  // Grant access to the protected route
  next();
});

// this function will test the req.cookies.jwt value to see if it's null
Object.exists = (obj) => typeof obj !== 'undefined' && obj !== null;

//! MIDDLEWARE TO CHECK WHEN USER IS LOGGED IN
exports.isLoggedIn = async (req, res, next) => {
  // if the jwt stores the value of loggedout then pass on to the next Middleware
  if (req.cookies.jwt === 'loggedout') return next();

  if (req.cookies.jwt) {
    // Verify the token is authentic - promisify the verify process so it can be awaited
    const payload = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    // Check if the user still exists in database
    const currentUser = await User.findById(payload.id);
    if (!currentUser) return next();

    // Check if the user has changed password after the token was issued
    if (currentUser.changedPasswordAfter(payload.iat)) return next();

    // THERE IS A LOGGED IN USER
    // Add user data to the request to use in next middleware function
    req.user = currentUser;
    // MAKE USER ACCESSIBLE TO PUG TEMPLATES
    res.locals.user = currentUser;

    return next();
  }

  if (!Object.exists(res.cookie.jwt)) {
    // This is where we check whether the cookie is null
    return next();
  }
};

//! RESTRICTED ROUTE MIDDLEWARE
exports.restrictTo = (...roles) => (req, res, next) => {
  // roles ['admin', 'lead guide']
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action.', 403),
    );
  }
  next();
};
