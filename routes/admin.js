const path = require('path');

const express = require('express');

const router = express.Router();

const adminController = require('../controllers/admin');

const isAuth = require('../middleware/is-auth');

const { body } = require('express-validator');

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// // /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  '/add-product',
  [
    body('title', 'book title must have 3+ letter')
      .isString()
      .trim()
      .isLength({ min: 3 }),
    body('price', 'price  must be a decimal number').isFloat(),
    body('description', 'description must between 5 - 400 characters long')
      .trim()
      .isLength({ min: 5, max: 400 }),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title', 'book title must have 3+ letter')
      .isString()
      .trim()
      .isLength({ min: 3 }),
    body('price', 'price  must be a decimal number').isFloat(),
    body('description', 'description must between 5 - 400 characters long')
      .trim()
      .isLength({ min: 5, max: 400 }),
  ],
  isAuth,
  adminController.postEditProduct
);

router.delete('/products/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
