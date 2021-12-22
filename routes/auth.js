const express = require('express');

const User = require('../models/user');

const router = express.Router();

const { check, body } = require('express-validator');

const authController = require('../controllers/authentication');

router.route('/login').get(authController.getLogin);
router
  .route('/login')
  .post(body('email').isEmail().normalizeEmail(), authController.postLogin);
router.route('/signup').get(authController.getSignUp);
router.route('/signup').post(
  [
    check('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email')
      .custom(async value => {
        const email = await User.find({ email: value });
        if (email.length > 0) {
          throw new Error('Email already exist');
        }
        return true;
      }),
    body('password', 'The password must be 5+ chars long and contain a number')
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error(
            'Confirm your password, your input must be the same with your password'
          );
        }
        return true;
      }),
  ],
  authController.postSignUp
);

router.route('/logout').post(authController.postLogout);
router.route('/reset').get(authController.getResetPassword);
router.route('/reset').post(authController.postResetPassword);

router.route('/reset/:token').get(authController.getUpdatePassword);

router.route('/reset-password').post(authController.postUpdatePassword);

module.exports = router;
