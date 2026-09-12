/**
 * Agent Assistance Service
 * Dedicated business logic for desk specialists handling applicant sessions and submissions.
 */
const { Op } = require('sequelize');
const {
  User,
  Profile,
  Job,
  TimeSlot,
  Application,
  AssistanceRequest,
  Payment,
} = require('../models');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Get aggregated dashboard statistics for an agent
 */
async function getAgentDashboard(agentId) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const totalAssignedSessions = await AssistanceRequest.count({
    where: { assignedAgentId: agentId },
  });

  const inProgressSessions = await AssistanceRequest.count({
    where: {
      assignedAgentId: agentId,
      status: ASSISTANCE_STATUSES.IN_PROGRESS,
    },
  });

  const completedSessions = await AssistanceRequest.count({
    where: {
      assignedAgentId: agentId,
      status: ASSISTANCE_STATUSES.COMPLETED,
    },
  });

  // Upcoming / Today's queue
  const queue = await AssistanceRequest.findAll({
    where: {
      assignedAgentId: agentId,
      status: { [Op.in]: [ASSISTANCE_STATUSES.SCHEDULED, ASSISTANCE_STATUSES.IN_PROGRESS] },
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: Job, as: 'job' },
      { model: TimeSlot, as: 'timeSlot' },
    ],
    order: [['createdAt', 'ASC']],
    limit: 10,
  });

  return {
    totalAssignedSessions,
    inProgressSessions,
    completedSessions,
    queue,
  };
}

/**
 * List all sessions assigned to this agent (with filter support)
 */
async function getAgentSessions(agentId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { assignedAgentId: agentId };

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  const { count, rows } = await AssistanceRequest.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: Job, as: 'job' },
      { model: TimeSlot, as: 'timeSlot' },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { sessions: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * List all candidate applications assigned to this agent
 */
async function getAgentApplications(agentId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { assignedAgentId: agentId };

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  const { count, rows } = await Application.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: Job, as: 'job' },
      { model: AssistanceRequest, as: 'assistanceRequest' },
      { model: Payment, as: 'payment' },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { applications: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Update an assistance session (Meeting URL, status, notes)
 */
async function updateSession(sessionId, agentId, updateData, userRole) {
  const session = await AssistanceRequest.findByPk(sessionId, {
    include: [{ model: User, as: 'user' }, { model: Job, as: 'job' }],
  });

  if (!session) {
    throw new AppError('Assistance session not found', 404);
  }

  // Ensure agent owns this session or is admin
  if (session.assignedAgentId !== agentId && userRole !== 'ADMIN') {
    throw new AppError('Unauthorized: You are not assigned to this assistance session', 403);
  }

  if (updateData.status) session.status = updateData.status;
  if (updateData.meetingUrl !== undefined) session.meetingUrl = updateData.meetingUrl;
  if (updateData.notes !== undefined) session.notes = updateData.notes;

  await session.save();
  return session;
}

/**
 * Update application progress stage
 */
async function updateApplicationStage(applicationId, agentId, { status, remarks }, userRole) {
  const application = await Application.findByPk(applicationId, {
    include: [{ model: User, as: 'user' }, { model: Job, as: 'job' }],
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (application.assignedAgentId !== agentId && userRole !== 'ADMIN') {
    throw new AppError('Unauthorized: You are not assigned to this application', 403);
  }

  application.status = status;
  if (remarks) {
    const history = application.statusHistory || [];
    history.push({
      status,
      timestamp: new Date().toISOString(),
      updatedBy: agentId,
      remarks,
    });
    application.statusHistory = history;
  }

  await application.save();
  return application;
}

module.exports = {
  getAgentDashboard,
  getAgentSessions,
  getAgentApplications,
  updateSession,
  updateApplicationStage,
};
