/**
 * Admin Service
 * Aggregates dashboard metrics, user growth analytics, revenue reports, and user governance.
 */
const { Op } = require('sequelize');
const {
  User,
  Profile,
  NotificationPreference,
  Application,
  AssistanceRequest,
  Membership,
  Payment,
  Feedback,
  sequelize,
} = require('../models');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { MEMBERSHIP_STATUSES } = require('../constants/membership.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { ROLES } = require('../constants/role.constant');
const { hashPassword } = require('../utils/password.util');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { logAction } = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

/**
 * Overview statistics for Admin Dashboard
 */
async function getDashboardOverview() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayStr = startOfToday.toISOString().split('T')[0];

  // User metrics
  const totalUsers = await User.count({ where: { role: 'USER' } });
  const newUsersToday = await User.count({
    where: { role: 'USER', createdAt: { [Op.gte]: startOfToday } },
  });
  const newUsersThisWeek = await User.count({
    where: { role: 'USER', createdAt: { [Op.gte]: startOfWeek } },
  });
  const newUsersThisMonth = await User.count({
    where: { role: 'USER', createdAt: { [Op.gte]: startOfMonth } },
  });

  // Membership metrics
  const totalMemberships = await Membership.count();
  const activePaidMembers = await Membership.count({
    where: { status: MEMBERSHIP_STATUSES.ACTIVE, endDate: { [Op.gte]: todayStr } },
  });
  const expiredMemberships = await Membership.count({
    where: { status: MEMBERSHIP_STATUSES.EXPIRED },
  });

  // Application metrics
  const totalApplications = await Application.count();
  const applicationsToday = await Application.count({
    where: { createdAt: { [Op.gte]: startOfToday } },
  });
  const applicationsThisWeek = await Application.count({
    where: { createdAt: { [Op.gte]: startOfWeek } },
  });
  const applicationsThisMonth = await Application.count({
    where: { createdAt: { [Op.gte]: startOfMonth } },
  });

  // Assistance requests
  const totalAssistanceRequests = await AssistanceRequest.count();
  const pendingAssistanceRequests = await AssistanceRequest.count({
    where: {
      status: [
        ASSISTANCE_STATUSES.REQUESTED,
        ASSISTANCE_STATUSES.PAYMENT_PENDING,
        ASSISTANCE_STATUSES.PAID,
        ASSISTANCE_STATUSES.ASSIGNED,
      ],
    },
  });
  const scheduledAssistanceRequests = await AssistanceRequest.count({
    where: { status: ASSISTANCE_STATUSES.SCHEDULED },
  });
  const completedAssistanceRequests = await AssistanceRequest.count({
    where: { status: ASSISTANCE_STATUSES.COMPLETED },
  });

  // Revenue metrics
  const assistanceRevenueSum = await Payment.sum('totalAmount', {
    where: { paymentType: 'ASSISTANCE', status: 'SUCCESS' },
  });
  const membershipRevenueSum = await Payment.sum('totalAmount', {
    where: { paymentType: 'MEMBERSHIP', status: 'SUCCESS' },
  });

  const assistanceRevenue = assistanceRevenueSum || 0;
  const membershipRevenue = membershipRevenueSum || 0;
  const totalRevenue = assistanceRevenue + membershipRevenue;

  // Feedback & complaints
  const totalFeedbackCount = await Feedback.count();
  const openComplaints = await Feedback.count({
    where: { type: 'COMPLAINT', status: 'OPEN' },
  });

  return {
    users: {
      total: totalUsers,
      newToday: newUsersToday,
      newThisWeek: newUsersThisWeek,
      newThisMonth: newUsersThisMonth,
    },
    memberships: {
      total: totalMemberships,
      active: activePaidMembers,
      expired: expiredMemberships,
    },
    applications: {
      total: totalApplications,
      today: applicationsToday,
      thisWeek: applicationsThisWeek,
      thisMonth: applicationsThisMonth,
    },
    assistance: {
      total: totalAssistanceRequests,
      pending: pendingAssistanceRequests,
      scheduled: scheduledAssistanceRequests,
      completed: completedAssistanceRequests,
    },
    revenue: {
      total: totalRevenue,
      assistance: assistanceRevenue,
      membership: membershipRevenue,
    },
    feedback: {
      total: totalFeedbackCount,
      openComplaints,
    },
  };
}

/**
 * User Growth Analytics API
 * Returns structured daily timeline data for UI charts (7d, 30d, 90d)
 */
async function getUserGrowthAnalytics(period = '30d') {
  let days = 30;
  if (period === '7d') days = 7;
  if (period === '90d') days = 90;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const users = await User.findAll({
    where: {
      role: 'USER',
      createdAt: { [Op.gte]: startDate },
    },
    attributes: ['createdAt'],
    order: [['createdAt', 'ASC']],
  });

  const totalUsersBeforeStart = await User.count({
    where: {
      role: 'USER',
      createdAt: { [Op.lt]: startDate },
    },
  });

  // Group by date YYYY-MM-DD
  const countsByDate = {};
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    countsByDate[key] = 0;
  }

  for (const user of users) {
    const key = new Date(user.createdAt).toISOString().split('T')[0];
    if (countsByDate[key] !== undefined) {
      countsByDate[key]++;
    }
  }

  let cumulative = totalUsersBeforeStart;
  const timeline = Object.keys(countsByDate)
    .sort()
    .map((date) => {
      const newUsers = countsByDate[date];
      cumulative += newUsers;
      return {
        date,
        newUsers,
        totalUsers: cumulative,
      };
    });

  return {
    period,
    data: timeline,
  };
}

/**
 * Admin: List and search users
 */
async function listUsers(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.role) {
    where.role = query.role;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    where.email = { [Op.like]: term };
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['passwordHash'] },
    include: [{ model: Profile, as: 'profile' }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { users: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: Update user status (e.g. ACTIVE / SUSPENDED)
 */
async function updateUserStatus(userId, status, actor) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from suspending themselves
  if (user.id === actor.id) {
    throw new AppError('Cannot alter status of current admin session', 400);
  }

  user.status = status;
  await user.save();

  await logAction({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.USER_STATUS_UPDATED,
    entityType: 'User',
    entityId: user.id,
    metadata: { status },
  });

  return user.toJSON();
}

/**
 * Application status distribution statistics
 */
async function getApplicationDistribution() {
  const stats = {};
  for (const status of Object.values(APPLICATION_STATUSES)) {
    stats[status] = await Application.count({ where: { status } });
  }
  return stats;
}

/**
 * List all applications with full candidate, job, and agent details
 */
async function listAllApplications(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  const { Job, TimeSlot, AuditLog } = require('../models');

  const { count, rows } = await Application.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'status'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: Job, as: 'job' },
      {
        model: AssistanceRequest,
        as: 'assistanceRequest',
        include: [{ model: TimeSlot, as: 'timeSlot' }],
      },
      { model: Payment, as: 'payment' },
      {
        model: User,
        as: 'assignedAgent',
        attributes: ['id', 'email', 'role'],
        include: [{ model: Profile, as: 'profile' }],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { applications: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Overview of platform financial transactions & collections
 */
async function getFinancialsOverview() {
  const totalRevenue = await Payment.sum('amount', { where: { status: 'SUCCESS' } }) || 0;
  const assistanceRevenue = await Payment.sum('amount', {
    where: { status: 'SUCCESS', type: 'ASSISTANCE_FEE' },
  }) || 0;
  const membershipRevenue = await Payment.sum('amount', {
    where: { status: 'SUCCESS', type: 'MEMBERSHIP' },
  }) || 0;

  const recentTransactions = await Payment.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile', attributes: ['fullName'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: 25,
  });

  return {
    totalRevenue,
    assistanceRevenue,
    membershipRevenue,
    recentTransactions,
  };
}

/**
 * List desk agents and their assigned workloads
 */
async function listAgents() {
  const agents = await User.findAll({
    where: { role: 'AGENT' },
    attributes: ['id', 'email', 'status', 'createdAt'],
    include: [{ model: Profile, as: 'profile' }],
  });

  const agentsWithWorkload = await Promise.all(
    agents.map(async (agent) => {
      const activeSessions = await AssistanceRequest.count({
        where: {
          assignedAgentId: agent.id,
          status: { [Op.in]: [ASSISTANCE_STATUSES.SCHEDULED, ASSISTANCE_STATUSES.IN_PROGRESS] },
        },
      });
      const completedSessions = await AssistanceRequest.count({
        where: {
          assignedAgentId: agent.id,
          status: ASSISTANCE_STATUSES.COMPLETED,
        },
      });

      return {
        ...agent.toJSON(),
        activeSessions,
        completedSessions,
      };
    })
  );

  return agentsWithWorkload;
}

/**
 * List system audit logs
 */
async function listAuditLogs(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const { AuditLog } = require('../models');

  const { count, rows } = await AuditLog.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { logs: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Create a new Desk Agent user (Admin only)
 */
async function createAgent({ email, password, fullName, phone = '' }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('An account with this email address already exists', 409);
  }

  const hashedPassword = await hashPassword(password);

  const result = await sequelize.transaction(async (t) => {
    const user = await User.create(
      {
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: ROLES.AGENT,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
      { transaction: t }
    );

    const profile = await Profile.create(
      {
        userId: user.id,
        email: normalizedEmail,
        fullName,
        position: 'AGENT',
        mobileNumber: phone || null,
        category: 'GENERAL',
        profileCompletionPercentage: 100,
      },
      { transaction: t }
    );

    await NotificationPreference.create(
      {
        userId: user.id,
        emailEnabled: true,
        telegramEnabled: false,
      },
      { transaction: t }
    );

    return { user, profile };
  });

  return {
    agent: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      status: result.user.status,
      profile: result.profile.toJSON(),
      createdAt: result.user.createdAt,
    },
  };
}

module.exports = {
  getDashboardOverview,
  getUserGrowthAnalytics,
  listUsers,
  updateUserStatus,
  getApplicationDistribution,
  listAllApplications,
  getFinancialsOverview,
  listAgents,
  createAgent,
  listAuditLogs,
};

