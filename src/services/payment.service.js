/**
 * Payment Service
 * Handles payment creation, transaction verification, and post-payment state transitions.
 * NEVER captures or stores credit cards, CVVs, UPI PINs, or banking passwords.
 */
const { Payment, AssistanceRequest, Application, Membership, sequelize } = require('../models');
const { PAYMENT_STATUSES, PAYMENT_PROVIDERS } = require('../constants/payment.constant');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { MEMBERSHIP_STATUSES } = require('../constants/membership.constant');
const { addMonths } = require('../utils/date.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Create a new payment record
 */
async function createPayment(
  {
    userId,
    paymentType,
    officialFee = 0,
    serviceFee = 0,
    totalAmount,
    applicationId = null,
    assistanceRequestId = null,
    membershipId = null,
    provider = PAYMENT_PROVIDERS.MOCK,
  },
  options = {}
) {
  const calculatedTotal = totalAmount !== undefined ? totalAmount : officialFee + serviceFee;

  const payment = await Payment.create(
    {
      userId,
      paymentType,
      officialFee,
      serviceFee,
      totalAmount: calculatedTotal,
      currency: 'INR',
      provider,
      status: PAYMENT_STATUSES.PENDING,
      applicationId,
      assistanceRequestId,
      membershipId,
    },
    options
  );

  return payment;
}

/**
 * Verify or simulate payment completion
 * @param {string} paymentId 
 * @param {object} options
 */
async function verifyAndProcessPayment(paymentId, { transactionId = null, success = true } = {}) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status === PAYMENT_STATUSES.SUCCESS) {
    return payment;
  }

  return sequelize.transaction(async (t) => {
    payment.transactionId = transactionId || `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    payment.status = success ? PAYMENT_STATUSES.SUCCESS : PAYMENT_STATUSES.FAILED;
    payment.paidAt = success ? new Date() : null;
    await payment.save({ transaction: t });

    if (!success) {
      return payment;
    }

    // 1. Process Assistance Request Payment
    if (payment.assistanceRequestId) {
      const assistance = await AssistanceRequest.findByPk(payment.assistanceRequestId, { transaction: t });
      if (assistance) {
        assistance.status = ASSISTANCE_STATUSES.PAID;
        await assistance.save({ transaction: t });

        if (assistance.applicationId) {
          const app = await Application.findByPk(assistance.applicationId, { transaction: t });
          if (app) {
            app.status = APPLICATION_STATUSES.PAYMENT_COMPLETED;
            app.paymentId = payment.id;
            await app.save({ transaction: t });
          }
        }
      }
    }

    // 2. Process Membership Payment
    if (payment.membershipId) {
      const membership = await Membership.findByPk(payment.membershipId, { transaction: t });
      if (membership) {
        const startDate = new Date();
        const endDate = addMonths(startDate, 3); // 3 months default quarterly plan

        membership.status = MEMBERSHIP_STATUSES.ACTIVE;
        membership.startDate = startDate.toISOString().split('T')[0];
        membership.endDate = endDate.toISOString().split('T')[0];
        membership.paymentId = payment.id;
        await membership.save({ transaction: t });
      }
    }

    return payment;
  });
}

module.exports = {
  createPayment,
  verifyAndProcessPayment,
};
