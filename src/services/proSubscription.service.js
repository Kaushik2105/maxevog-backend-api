/**
 * ProSubscription Service
 * Manages Pro Club subscription lifecycles, 3-month quarterly validity, and 1 free application assistance credit.
 */
const { Op } = require('sequelize');
const { ProSubscription, User, Profile, Membership } = require('../models');
const { PRO_SUBSCRIPTION_STATUSES } = require('../models/proSubscription.model');
const { addMonths } = require('../utils/date.util');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

/**
 * Get active Pro Club status for a candidate
 * @param {string} userId
 */
async function getProStatus(userId) {
  let subscription = await ProSubscription.findOne({
    where: {
      userId,
      status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
    },
    order: [['endDate', 'DESC']],
  });

  // Backward compatibility: If no ProSubscription exists yet, check legacy Membership table
  if (!subscription) {
    const legacyMembership = await Membership.findOne({
      where: {
        userId,
        status: 'ACTIVE',
      },
      order: [['endDate', 'DESC']],
    });

    if (legacyMembership && new Date(legacyMembership.endDate).getTime() >= Date.now()) {
      // Migrate legacy membership to ProSubscription record
      subscription = await ProSubscription.create({
        userId,
        planId: legacyMembership.planId || 'PRO_QUARTERLY_249',
        planName: legacyMembership.planName || 'maxEvoG Pro Club (Quarterly - 3 Months)',
        amount: legacyMembership.amount || 249,
        startDate: legacyMembership.startDate || new Date().toISOString().split('T')[0],
        endDate: legacyMembership.endDate,
        status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
        assistanceCreditsTotal: 1,
        assistanceCreditsUsed: 0,
      });
    }
  }

  if (!subscription) {
    return {
      isPro: false,
      subscription: null,
      assistanceCredits: {
        total: 0,
        used: 0,
        remaining: 0,
        available: false,
      },
      daysRemaining: 0,
    };
  }

  // Check if expired
  const now = Date.now();
  const endDateMs = new Date(subscription.endDate).getTime();
  if (endDateMs < now) {
    subscription.status = PRO_SUBSCRIPTION_STATUSES.EXPIRED;
    await subscription.save();
    return {
      isPro: false,
      subscription,
      assistanceCredits: {
        total: subscription.assistanceCreditsTotal,
        used: subscription.assistanceCreditsUsed,
        remaining: 0,
        available: false,
      },
      daysRemaining: 0,
    };
  }

  const daysRemaining = Math.max(0, Math.ceil((endDateMs - now) / (1000 * 60 * 60 * 24)));
  const creditsRemaining = Math.max(0, subscription.assistanceCreditsTotal - subscription.assistanceCreditsUsed);

  return {
    isPro: true,
    subscription,
    assistanceCredits: {
      total: subscription.assistanceCreditsTotal,
      used: subscription.assistanceCreditsUsed,
      remaining: creditsRemaining,
      available: creditsRemaining > 0,
    },
    daysRemaining,
  };
}

/**
 * Activate Pro Club for candidate (V1: Instant 3-month activation)
 * @param {string} userId
 * @param {object} [options]
 */
async function activateProClub(userId, options = {}) {
  const user = await User.findByPk(userId, {
    include: [{ model: Profile, as: 'profile' }],
  });

  if (!user) {
    throw new Error('Candidate user account not found');
  }

  const startDate = new Date();
  const endDate = addMonths(startDate, 3); // Strictly 3 Months per user request

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Expire or cancel any existing active subscriptions
  await ProSubscription.update(
    { status: PRO_SUBSCRIPTION_STATUSES.EXPIRED },
    { where: { userId, status: PRO_SUBSCRIPTION_STATUSES.ACTIVE } }
  );

  const subscription = await ProSubscription.create({
    userId,
    planId: options.planId || 'PRO_QUARTERLY_249',
    planName: options.planName || 'maxEvoG Pro Club (Quarterly - 3 Months)',
    amount: options.amount || 249.0,
    startDate: startDateStr,
    endDate: endDateStr,
    status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
    assistanceCreditsTotal: 1,
    assistanceCreditsUsed: 0,
  });

  logger.info(`[Pro Club] Candidate ${userId} activated Pro Club (valid until ${endDateStr})`);

  // Asynchronously trigger initial job matching
  try {
    const jobMatchingService = require('./jobMatching.service');
    jobMatchingService.matchAllJobsForCandidate(userId).catch((err) => {
      logger.error(`[Pro Club] Error during initial job matching for ${userId}: ${err.message}`);
    });
  } catch (err) {
    logger.error(`[Pro Club] Job matching service load error: ${err.message}`);
  }

  // Trigger pro welcome notification
  try {
    const proNotificationService = require('./proNotification.service');
    proNotificationService.notifyProActivated(userId, subscription).catch((err) => {
      logger.error(`[Pro Club] Welcome notification error: ${err.message}`);
    });
  } catch (err) {
    // Notification service might be loading
  }

  return {
    isPro: true,
    subscription,
    daysRemaining: 90,
    assistanceCredits: {
      total: 1,
      used: 0,
      remaining: 1,
      available: true,
    },
    message: 'Welcome to maxEvoG Pro Club! Your 3-month membership and 1 free application assistance credit are now active.',
  };
}

/**
 * Consume 1 free application assistance credit
 * @param {string} userId
 * @param {object} [transaction]
 */
async function consumeAssistanceCredit(userId, transaction = null) {
  const subscription = await ProSubscription.findOne({
    where: {
      userId,
      status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
    },
    transaction,
  });

  if (!subscription || !subscription.isActive()) {
    return { success: false, reason: 'No active Pro subscription' };
  }

  if (subscription.assistanceCreditsUsed >= subscription.assistanceCreditsTotal) {
    return { success: false, reason: 'Assistance credit already consumed' };
  }

  subscription.assistanceCreditsUsed += 1;
  await subscription.save({ transaction });

  logger.info(`[Pro Club] 1 Free Assistance Credit consumed for user ${userId}`);

  return {
    success: true,
    creditsRemaining: subscription.assistanceCreditsTotal - subscription.assistanceCreditsUsed,
  };
}

/**
 * Admin: Get Pro Club statistics
 */
async function getAdminProStats() {
  const today = new Date().toISOString().split('T')[0];

  const totalSubscribers = await ProSubscription.count();
  const activeSubscribers = await ProSubscription.count({
    where: {
      status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
      endDate: { [Op.gte]: today },
    },
  });

  const creditsUsedSum = await ProSubscription.sum('assistanceCreditsUsed') || 0;
  const creditsTotalSum = await ProSubscription.sum('assistanceCreditsTotal') || 0;

  return {
    totalSubscribers,
    activeSubscribers,
    assistanceCredits: {
      totalGranted: creditsTotalSum,
      totalConsumed: creditsUsedSum,
      availableInEcosystem: Math.max(0, creditsTotalSum - creditsUsedSum),
    },
  };
}

/**
 * Admin: List Pro Club subscribers with pagination
 */
async function listAdminProSubscribers(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  const { count, rows } = await ProSubscription.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'status', 'createdAt'],
        include: [
          {
            model: Profile,
            as: 'profile',
            attributes: ['fullName', 'mobileNumber', 'state', 'category', 'profileCompletionPercentage'],
          },
        ],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    subscribers: rows,
    meta: buildPaginationMeta({ count, page, limit }),
  };
}

module.exports = {
  getProStatus,
  activateProClub,
  consumeAssistanceCredit,
  getAdminProStats,
  listAdminProSubscribers,
};
