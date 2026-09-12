/**
 * Payment Routes
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/:id/verify', authenticate, paymentController.verifyPayment);

module.exports = router;
