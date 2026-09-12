/**
 * Payment Controller
 */
const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../utils/response.util');

async function verifyPayment(req, res, next) {
  try {
    const { transactionId, success } = req.body;
    const isSuccess = success !== undefined ? Boolean(success) : true;

    const payment = await paymentService.verifyAndProcessPayment(req.params.id, {
      transactionId,
      success: isSuccess,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Payment ${isSuccess ? 'completed successfully' : 'failed'}`,
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  verifyPayment,
};
