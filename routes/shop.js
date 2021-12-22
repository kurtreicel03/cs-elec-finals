const path = require('path');

const express = require('express');

const router = express.Router();

const shopController = require('../controllers/shop');

const isAuth = require('../middleware/is-auth');

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

// router.get("/products/:productId", shopController.getProduct);

router.route('/cart').post(isAuth, shopController.postCart);
router.route('/cart').get(isAuth, shopController.getCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout/success', isAuth, shopController.postOrder);

router.get('/orders', isAuth, shopController.getOrders);
router.get('/orders/:orderId', isAuth, shopController.getInvoice);

router.route('/checkout').get(isAuth, shopController.getCheckout);

module.exports = router;
