const path = require('path');

const express = require('express');

const bodyParser = require('body-parser');

const session = require('express-session');

const MongoDBStore = require('connect-mongodb-session')(session);

const errorController = require('./controllers/error');

const User = require('./models/user');

const csrf = require('csurf');

const flash = require('connect-flash');

const multer = require('multer');

const app = express();

const store = new MongoDBStore({
  uri: process.env.DB.replace('<PASSWORD>', process.env.DB_PASSWORD),
  collection: 'sessions',
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  }

  cb(null, false);
};

const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(express.urlencoded({ extended: false }));
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
  session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: false,
    store,
  })
);

app.use(csrfProtection);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return next();
    }

    const user = await User.findById(req.session.user._id);
    req.user = user;
    next();
  } catch (error) {
    next(new Error(error));
  }
});

app.use('/admin', adminRoutes);

app.use(shopRoutes);

app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.httpStatusCode || 500;
  res.status(statusCode).render('500', {
    pageTitle: 'Error',
    path: '/500',
    msg: error.toString().split('at').toString().split(':')[1],
    isAuthenticated: req.session.isLoggedIn,
  });
});

module.exports = app;
