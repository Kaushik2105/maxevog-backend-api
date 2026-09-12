/**
 * Admin Controller
 */
const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/response.util');

async function getDashboardOverview(req, res, next) {
  try {
    const overview = await adminService.getDashboardOverview();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Dashboard overview metrics fetched successfully',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserGrowth(req, res, next) {
  try {
    const period = req.query.period || '30d';
    const analytics = await adminService.getUserGrowthAnalytics(period);
    return sendSuccess(res, {
      statusCode: 200,
      message: `User growth analytics for ${period} fetched successfully`,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { users, meta } = await adminService.listUsers(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Users fetched successfully',
      data: { users },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    const user = await adminService.updateUserStatus(req.params.id, status, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: `User status updated to ${status}`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function getApplicationStats(req, res, next) {
  try {
    const stats = await adminService.getApplicationDistribution();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Application distribution stats fetched successfully',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}

async function listAllApplications(req, res, next) {
  try {
    const { applications, meta } = await adminService.listAllApplications(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'All applications fetched successfully',
      data: { applications },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getFinancialsOverview(req, res, next) {
  try {
    const financials = await adminService.getFinancialsOverview();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Financials overview fetched successfully',
      data: financials,
    });
  } catch (error) {
    next(error);
  }
}

async function listAgents(req, res, next) {
  try {
    const agents = await adminService.listAgents();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Desk agents fetched successfully',
      data: { agents },
    });
  } catch (error) {
    next(error);
  }
}

async function createAgent(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body;
    const result = await adminService.createAgent({ email, password, fullName, phone });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Desk agent account created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const { logs, meta } = await adminService.listAuditLogs(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Audit logs fetched successfully',
      data: { logs },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardOverview,
  getUserGrowth,
  listUsers,
  updateUserStatus,
  getApplicationStats,
  listAllApplications,
  getFinancialsOverview,
  listAgents,
  createAgent,
  listAuditLogs,
};
