/**
 * Agent Controller
 * HTTP endpoints for desk agents and specialists.
 */
const agentService = require('../services/agent.service');
const { sendSuccess } = require('../utils/response.util');

async function getDashboard(req, res, next) {
  try {
    const data = await agentService.getAgentDashboard(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Agent desk metrics fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getSessions(req, res, next) {
  try {
    const { sessions, meta } = await agentService.getAgentSessions(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assigned sessions fetched successfully',
      data: { sessions },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getApplications(req, res, next) {
  try {
    const { applications, meta } = await agentService.getAgentApplications(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assigned applications fetched successfully',
      data: { applications },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSession(req, res, next) {
  try {
    const session = await agentService.updateSession(
      req.params.id,
      req.user.id,
      req.body,
      req.user.role
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assistance session updated successfully',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
}

async function updateApplicationStage(req, res, next) {
  try {
    const application = await agentService.updateApplicationStage(
      req.params.id,
      req.user.id,
      req.body,
      req.user.role
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Application stage updated successfully',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getSessions,
  getApplications,
  updateSession,
  updateApplicationStage,
};
