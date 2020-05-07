/* eslint-disable consistent-return */
//  IMPORT MODULES
const User = require('../models/userModel');
const factory = require('./handlerFactory');

//* Factory Functions
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.getUserByName = factory.checkIfUserExists(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

// * GET ME
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// *CREATE USER - This is to remain an undefined route
exports.createUser = (req, res) => {
  // SEND RESPONSE TO USER
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Use /signup instead',
  });
};
