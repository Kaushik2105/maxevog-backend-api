/**
 * Membership Controller
 */
const membershipService = require('../services/membership.service');
const { sendSuccess } = require('../utils/response.util');

async function getCurrentMembership(req, res, next) {
  try {
    const status = await membershipService.getCurrentMembership(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership status fetched successfully',
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

async function purchaseMembership(req, res, next) {
  try {
    const { planId } = req.body;
    const result = await membershipService.purchaseMembership(req.user.id, planId);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Membership checkout initiated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const history = await membershipService.getMembershipHistory(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership history fetched successfully',
      data: { history },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminMemberships(req, res, next) {
  try {
    const { memberships, meta } = await membershipService.listAdminMemberships(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Memberships fetched successfully',
      data: { memberships },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function listPaidMembers(req, res, next) {
  try {
    const { paidMembers, meta } = await membershipService.listPaidMembers(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Active paid members fetched successfully',
      data: { paidMembers },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await membershipService.getMembershipStats();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Membership statistics fetched successfully',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentMembership,
  purchaseMembership,
  getHistory,
  listAdminMemberships,
  listPaidMembers,
  getStats,
};
