const User = require('../models/user');

const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const sendEmail = require('../util/mail');

const { validationResult } = require('express-validator');

const renderAuth = (
  res,
  path,
  title,
  msg,
  email = '',
  pass = '',
  confirm = '',
  validationError = []
) =>
  res.status(422).render(`auth/${path}`, {
    path: `/${path}`,
    pageTitle: title,
    errorMessage: msg,
    oldInput: { email, pass, confirm },
    validationError,
  });

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  message.length > 0 ? (message = message[0]) : (message = null);
  renderAuth(res, 'login', 'Login', message);
};

exports.getSignUp = (req, res, next) => {
  renderAuth(res, 'signup', 'Sign Up', false);
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return renderAuth(
        res,
        'login',
        'Login',
        errors.array()[0].msg,
        email,
        password,
        '',
        errors.array()
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return renderAuth(
        res,
        'login',
        'Login',
        'Invalid Email',
        email,
        password,
        '',
        [{ param: 'email' }]
      );
    }

    const authenticate = await bcrypt.compare(password, user.password);
    if (!authenticate) {
      return renderAuth(
        res,
        'login',
        'Login',
        'Invalid Password',
        email,
        password,
        '',
        [{ param: 'password' }]
      );
    }

    req.session.user = user;
    req.session.isLoggedIn = true;

    req.session.save(() => {
      res.redirect('/');
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.postSignUp = async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return renderAuth(
        res,
        'signup',
        'Sign Up',
        errors.array()[0].msg,
        email,
        password,
        confirmPassword,
        errors.array()
      );
    }

    const hashPassword = await bcrypt.hash(password, 12);

    await User.create({
      email,
      password: hashPassword,
      cart: { items: [] },
    });

    try {
      await sendEmail({
        email: email,
        subject: 'Thanks For signing up',
        message: 'SIGN UP SUCCESSFULL',
      });
    } catch (error) {
      console.log(error);
      const err = new Error('Something went very wrong');
      err.httpStatusCode = 500;
      next(err);
    }
    res.redirect('/login');
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
};

exports.getResetPassword = (req, res, next) => {
  let message = req.flash('error');
  message.length > 0 ? (message = message[0]) : (message = null);
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message,
  });
};

exports.postResetPassword = async (req, res, next) => {
  const { email } = req.body;
  const token = await crypto.randomBytes(32).toString('hex');

  const user = await User.findOne({ email });
  if (!user) {
    req.flash('error', 'No existing user with that email');
    res.redirect('/login');
  }

  user.resetToken = token;
  user.resetTokenExpires = Date.now() + 10 * 60 * 60;

  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: email,
      subject: 'RESET PASSWORD (VALID FOR 10min)',
      message: 'HERE IS YOUR LINK TOKEN TO RESET YOUR PASSWORD',
      html: `<a href="http://127.0.0.1:8000/reset/${token}">Reset Here</a>`,
    });

    req.flash('error', 'Token Succesfully sent to your email');
    res.redirect('/reset');
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getUpdatePassword = async (req, res, next) => {
  try {
    let message = req.flash('error');
    message.length > 0 ? (message = message[0]) : (message = null);

    const token = req.params.token;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      req.flash('error', 'TOKEN EXPIRED OR INVALID TOKEN');
      res.redirect('/reset');
    }

    res.render('auth/reset-password', {
      path: '/reset-password',
      pageTitle: 'Reset Password',
      errorMessage: message,
      userId: user._id,
    });
  } catch (error) {}
};

exports.postUpdatePassword = async (req, res, next) => {
  try {
    let message = req.flash('error');
    message.length > 0 ? (message = message[0]) : (message = null);

    const { password, userId } = req.body;

    const user = await User.findById({ _id: userId });

    if (!user) {
      req.flash('error', 'No user found');
      res.redirect('/login');
    }
    const hashPass = await bcrypt.hash(password, 12);

    user.password = hashPass;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.render('auth/login', {
      path: '/login',
      pageTitle: 'Reset Password',
      errorMessage: message,
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};
