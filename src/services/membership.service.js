/**
 * Membership Service
 * Manages membership subscriptions (₹99 / 3 months launch plan) and status lifecycles.
 */
const { Op } = require('sequelize');
const { Membership, Payment, User, Profile } = require('../models');
const { MEMBERSHIP_STATUSES, MEMBERSHIP_PLANS } = require('../constants/membership.constant');
const { PAYMENT_TYPES } = require('../constants/payment.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { createPayment } = require('./payment.service');
const { logAction } = require('./audit.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Get current active membership for a user
 */
async function getCurrentMembership(userId) {
  const membership = await Membership.findOne({
    where: {
      userId,
      status: MEMBERSHIP_STATUSES.ACTIVE,
    },
    include: [{ model: Payment, as: 'payment' }],
    order: [['endDate', 'DESC']],
  });

  if (!membership) {
    return { hasActiveMembership: false, membership: null };
  }

  // Check if expired
  if (new Date(membership.endDate).getTime() < Date.now()) {
    membership.status = MEMBERSHIP_STATUSES.EXPIRED;
    await membership.save();
    return { hasActiveMembership: false, membership };
  }

  return { hasActiveMembership: true, membership };
}

/**
 * Purchase or initiate membership purchase
 */
async function purchaseMembership(userId, planId = 'QUARTERLY_99') {
  let selectedPlan = MEMBERSHIP_PLANS.QUARTERLY;
  if (planId === MEMBERSHIP_PLANS.YEARLY.id) {
    selectedPlan = MEMBERSHIP_PLANS.YEARLY;
  }

  const membership = await Membership.create({
    userId,
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    amount: selectedPlan.price,
    status: MEMBERSHIP_STATUSES.PENDING,
  });

  const payment = await createPayment({
    userId,
    paymentType: PAYMENT_TYPES.MEMBERSHIP,
    serviceFee: selectedPlan.price,
    totalAmount: selectedPlan.price,
    membershipId: membership.id,
  });

  membership.paymentId = payment.id;
  await membership.save();

  await logAction({
    actorId: userId,
    actorRole: 'USER',
    action: AUDIT_ACTIONS.MEMBERSHIP_CREATED,
    entityType: 'Membership',
    entityId: membership.id,
    metadata: { planId: selectedPlan.id, amount: selectedPlan.price },
  });

  return {
    membership,
    payment,
  };
}

/**
 * Get user membership history
 */
async function getMembershipHistory(userId) {
  return Membership.findAll({
    where: { userId },
    include: [{ model: Payment, as: 'payment' }],
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Admin: List memberships with filters
 */
async function listAdminMemberships(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  const { count, rows } = await Membership.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'status'],
        include: [{ model: Profile, as: 'profile', attributes: ['fullName', 'mobileNumber'] }],
      },
      { model: Payment, as: 'payment' },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { memberships: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: List active paid members
 */
async function listPaidMembers(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const today = new Date().toISOString().split('T')[0];

  const where = {
    status: MEMBERSHIP_STATUSES.ACTIVE,
    endDate: { [Op.gte]: today },
  };

  const { count, rows } = await Membership.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'status', 'createdAt'],
        include: [{ model: Profile, as: 'profile', attributes: ['fullName', 'mobileNumber', 'state'] }],
      },
      { model: Payment, as: 'payment' },
    ],
    order: [['endDate', 'ASC']],
    limit,
    offset,
  });

  return { paidMembers: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: Get membership statistics
 */
async function getMembershipStats() {
  const today = new Date().toISOString().split('T')[0];

  const totalMemberships = await Membership.count();
  const activeMembers = await Membership.count({
    where: {
      status: MEMBERSHIP_STATUSES.ACTIVE,
      endDate: { [Op.gte]: today },
    },
  });
  const expiredMemberships = await Membership.count({
    where: {
      status: MEMBERSHIP_STATUSES.EXPIRED,
    },
  });

  const revenueSum = await Payment.sum('totalAmount', {
    where: {
      paymentType: PAYMENT_TYPES.MEMBERSHIP,
      status: 'SUCCESS',
    },
  });

  return {
    totalMemberships,
    activeMembers,
    expiredMemberships,
    totalRevenue: revenueSum || 0,
  };
}

module.exports = {
  getCurrentMembership,
  purchaseMembership,
  getMembershipHistory,
  listAdminMemberships,
  listPaidMembers,
  getMembershipStats,
};
