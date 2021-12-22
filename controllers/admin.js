const Product = require('../models/product');

const { validationResult } = require('express-validator');

const fileSystem = require('../util/fileSystem');

const LIMIT_PER_PAGE = 9;

exports.getAddProduct = (req, res, next) => {
  try {
    res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: false,
      product: {},
      errorMessage: null,
      isAuthenticated: req.session.isLoggedIn,
      validationError: [],
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    const totalProducts = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * LIMIT_PER_PAGE)
      .limit(LIMIT_PER_PAGE);

    res.render('admin/products', {
      prods: products,
      pageTitle: 'Admin Products',
      path: '/admin/products',
      isAuthenticated: req.session.isLoggedIn,
      totalProducts: totalProducts,
      currentPage: page,
      hasNextPage: LIMIT_PER_PAGE * page < totalProducts,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalProducts / LIMIT_PER_PAGE),
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.postAddProduct = async (req, res, next) => {
  try {
    const { title, price, description } = req.body;
    const image = req.file;
    const errors = validationResult(req);

    if (!errors.isEmpty() || !image) {
      console.log(errors.array());
      return res.status(422).render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/edit-product',
        editing: false,
        hasError: true,
        product: { title, price, description },
        isAuthenticated: req.session.isLoggedIn,
        errorMessage: errors.array()[0].msg,
        validationError: errors.array(),
      });
    }

    await Product.create({
      title,
      price,
      description,
      image: image.path,
      userId: req.user,
    });

    res.redirect('/admin/products');
  } catch (error) {
    console.log(error);
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const editMode = req.query.edit;
    if (!editMode) {
      return res.redirect('/');
    }
    const prodId = req.params.productId;

    const product = await Product.findById(prodId);

    res.render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: editMode,
      hasError: false,
      product: product,
      isAuthenticated: req.session.isLoggedIn,
      errorMessage: null,
      validationError: [],
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.postEditProduct = async (req, res, next) => {
  try {
    const { title, price, description } = req.body;
    const image = req.file;
    const prod = await Product.findById({ _id: req.body.productId });

    let imgUrl = image.path;
    if (!image) {
      imgUrl = prod.image;
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: true,
        hasError: true,
        product: {
          title,
          price,
          description,
          _id: req.body.productId,
        },
        isAuthenticated: req.session.isLoggedIn,
        errorMessage: 'Error updating product',
        validationError: errors.array(),
      });
    }

    if (image) {
      fileSystem.deleteFile(prod.image);
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.body.productId, userId: req.user._id },
      {
        title,
        price,
        description,
        image: imgUrl,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    console.log(product);

    res.redirect('/admin/products');
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById({ _id: productId });

    fileSystem.deleteFile(product.image);

    await Product.findOneAndDelete({
      _id: productId,
      userId: req.user._id,
    });

    res.status(202).json({
      status: 'success',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
    });
  }
};
