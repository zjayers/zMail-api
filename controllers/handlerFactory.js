/* eslint-disable consistent-return */
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

//* GET ALL
exports.getAll = (Model) => catchAsync(async (req, res) => {
  // To allow for nested routes
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };

  // BUILD THE QUERY
  const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .pageinate();

  // EXECUTE QUERY
  const doc = await features.dbQuery;

  // SEND RESPONSE TO USER
  res.status(200).json({ status: 'success', results: doc.length, data: doc });
});

//* GET ONE
exports.getOne = (Model) => catchAsync(async (req, res, next) => {
  const query = Model.findById(req.params.id);
  const doc = await query;
  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({ status: 'success', data: doc });
});

//* GET ONE
exports.checkIfUserExists = (Model) => catchAsync(async (req, res) => {
  const query = Model.find({ name: req.body.username });
  const doc = await query;

  if (!doc.length || !doc) {
    res.status(200).json({ status: 'success', available: true });
  } else {
    res.status(422).json({ status: 'success', username: 'Username in use' });
  }
});

// *CREATE ONE
exports.createOne = (Model) => catchAsync(async (req, res) => {
  const doc = await Model.create(req.body);
  res.status(201).json({ status: 'success', data: doc });
});

// *UPDATE ONE
exports.updateOne = (Model) => catchAsync(async (req, res) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the new document
    runValidators: true, // Validate that input values are of correct type
  });

  if (!doc) {
    throw new AppError('No document found with that ID', 404);
  }

  res.status(200).json({ status: 'success', data: { doc } });
});

// *DELETE ONE - HANDLER FACTORY
exports.deleteOne = (Model) => catchAsync(async (req, res) => {
  const doc = await Model.findByIdAndDelete(req.params.id);

  if (!doc) {
    throw new AppError('No document found with that ID', 404);
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
