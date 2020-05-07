/* eslint-disable max-len */
// IMPORT MODULES
const express = require('express'); // express framework
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// MOUNT ROUTER
const router = express.Router();

// *SIGN UP/LOGIN ROUTES
router.post('/signup', authController.signup);
router.post('/signin', authController.login);
router.get('/signout', authController.logout);
router.post('/username', userController.getUserByName);
router.get('/isLoggedIn', authController.isLoggedIn);


router.get(
  '/me',
  authController.protect,
  userController.getMe,
  userController.getUser,
);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser);

// EXPORT ROUTER
module.exports = router;
