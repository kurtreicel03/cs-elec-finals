const Product = require('../models/product');
const User = require('../models/user');
const Orders = require('../models/order');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const stripe = require('stripe')(process.env.STRIPE_API);

const LIMIT_PER_PAGE = 9;

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    const totalProducts = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * LIMIT_PER_PAGE)
      .limit(LIMIT_PER_PAGE);

    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'All Products',
      path: '/products',
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
    console.log(error);
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const prodId = req.params.productId;

    const product = await Product.findById(prodId);

    res.render('shop/product-detail', {
      product: product,
      pageTitle: product.title,
      path: '/products',
      isAuthenticated: req.session.isLoggedIn,
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    const totalProducts = await Product.countDocuments();

    const products = await Product.find()
      .skip((page - 1) * LIMIT_PER_PAGE)
      .limit(LIMIT_PER_PAGE);
    res.render('shop/index', {
      prods: products,
      pageTitle: 'Shop',
      path: '/',
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
    console.log(error);
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const prod = await req.user.populate('cart.items.productId').execPopulate();

    res.status(200).render('shop/cart', {
      path: '/cart',
      pageTitle: 'Your Cart',
      products: prod.cart.items,
      isAuthenticated: req.session.isLoggedIn,
    });
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getCheckout = async (req, res) => {
  try {
    console.log(res.locals);
    const prod = await req.user.populate('cart.items.productId').execPopulate();
    let total = 0;
    prod.cart.items.forEach(item => {
      total += +item.productId.price;
    });
    console.log(
      prod.cart.items.map(item => {
        return {
          name: item.productId.title,
          amount: +item.productId.price,
          quantity: item.quantity,
        };
      })
    );
    const session = await stripe.checkout.sessions.create({
      success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
      payment_method_types: ['card'],
      line_items: prod.cart.items.map(item => {
        return {
          name: item.productId.title,
          amount: +item.productId.price * 100,
          quantity: item.quantity,
          currency: 'usd',
        };
      }),
      mode: 'payment',
    });

    res.status(200).render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'Checkout',
      products: prod.cart.items,
      totalSum: total,
      isAuthenticated: req.session.isLoggedIn,
      sessionId: session.id,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.stripeCheckout = async (req, res, next) => {
  const prod = await req.user.populate('cart.items.productId').execPopulate();

  console.log(session);
};

exports.postCart = async (req, res, next) => {
  try {
    const product = await Product.findById(req.body.productId);

    const cart = await req.user.addToCart(product);

    res.redirect('/cart');
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;

  await req.user.deleteFromCart(prodId);

  res.redirect('/cart');
};

exports.postOrder = async (req, res, next) => {
  try {
    const prod = await req.user.populate('cart.items.productId').execPopulate();
    const product = prod.cart.items.map(item => {
      return { product: { ...item.productId._doc }, quantity: item.quantity };
    });

    const order = await Orders.create({
      products: product,
      user: {
        name: req.user.name,
        userId: req.user._id,
      },
    });

    await req.user.removeCartItem();

    res.redirect('/cart');
  } catch (error) {
    const err = new Error('Something went very wrong');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find({ 'user.userId': req.session.user._id });
    res.render('shop/orders', {
      path: '/orders',
      pageTitle: 'Your Orders',
      orders: orders,
      isAuthenticated: req.session.isLoggedIn,
    });
  } catch (error) {
    const err = new Error('Something went very wrong on getting order');
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = `invoice-${orderId}.pdf`;
  const invoicePath = path.join('data', 'invoice', invoiceName);

  const order = await Orders.findById({ _id: orderId });

  if (order.user.userId.toString() !== req.user._id.toString()) {
    const err = new Error('Failed getting invoice, not authorize');
    err.httpStatusCode = 403;
    return next(err);
  }

  const pdfDoc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="'${invoiceName}'"`);

  pdfDoc.pipe(fs.createWriteStream(invoicePath));
  pdfDoc.pipe(res);
  pdfDoc.fontSize(25).text('Invoice');
  pdfDoc.text('--------------------------------');

  let orderTotal = 0;
  order.products.forEach(item => {
    orderTotal += item.product.price * item.quantity;
    pdfDoc
      .fontSize(14)
      .text(
        `${item.product.title} : ${item.product.price} * ${item.quantity} = $${
          item.product.price * item.quantity
        } `
      );
  });
  pdfDoc.text('-----');

  pdfDoc.fontSize(20).text(`Total: $${orderTotal}`);
  pdfDoc.end();
};
