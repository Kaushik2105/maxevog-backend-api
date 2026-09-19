/**
 * Agent Assistance Service
 * Dedicated business logic for desk specialists handling applicant sessions and submissions.
 */
const { Op } = require('sequelize');
const {
  User,
  Profile,
  Job,
  Application,
  AssistanceRequest,
  Payment,
} = require('../models');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { APPLICATION_STATUSES, ALL_APPLICATION_STATUSES } = require('../constants/application.constant');
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
      { model: Application, as: 'application' },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const sessions = rows.map((r) => {
    const s = r.toJSON();
    s.User = s.user;
    s.meetingUrl = s.meetingLink || s.meetingUrl || '';

    if (s.application) {
      const meta = typeof s.application.metadata === 'string'
        ? JSON.parse(s.application.metadata || '{}')
        : (s.application.metadata || {});
      s.documents = Array.isArray(meta.documents) ? meta.documents : [];
      s.application.documents = s.documents;
    } else {
      s.documents = [];
    }

    return s;
  });

  return { sessions, meta: buildPaginationMeta({ count, page, limit }) };
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
 * Update assistance session details (Google Meet link, internal notes, completion status)
 */
/**
 * Auto-dispatch next queued assistance request to an idle agent
 */
async function dispatchNextQueuedRequest(agentId) {
  const queuedRequest = await AssistanceRequest.findOne({
    where: {
      assignedAgentId: null,
      status: {
        [Op.in]: [
          ASSISTANCE_STATUSES.SCHEDULED,
          ASSISTANCE_STATUSES.REQUESTED,
          ASSISTANCE_STATUSES.PAID,
          ASSISTANCE_STATUSES.URGENT_PENDING_REVIEW,
        ],
      },
    },
    order: [['createdAt', 'ASC']],
  });

  if (!queuedRequest) {
    const profile = await Profile.findOne({ where: { userId: agentId } });
    if (profile && profile.agentStatus !== 'IDLE') {
      profile.agentStatus = 'IDLE';
      await profile.save();
    }
    return null;
  }

  queuedRequest.assignedAgentId = agentId;
  queuedRequest.status = ASSISTANCE_STATUSES.ASSIGNED;
  await queuedRequest.save();

  if (queuedRequest.applicationId) {
    const app = await Application.findByPk(queuedRequest.applicationId);
    if (app) {
      app.assignedAgentId = agentId;
      app.status = APPLICATION_STATUSES.IN_PROGRESS;
      await app.save();
    }
  }

  const profile = await Profile.findOne({ where: { userId: agentId } });
  if (profile) {
    profile.agentStatus = 'ASSISTING';
    await profile.save();
  }

  return queuedRequest;
}

/**
 * Update assistance session details (Google Meet link, internal notes, completion status)
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
  const link = updateData.meetingLink !== undefined ? updateData.meetingLink : updateData.meetingUrl;
  if (link !== undefined) {
    session.meetingLink = link;
    session.meetingUrl = link;
  }
  if (updateData.notes !== undefined) session.notes = updateData.notes;

  await session.save();

  try {
    const { emitAssistanceUpdate } = require('./socket.service');
    emitAssistanceUpdate(session.id, session.toJSON());
  } catch (socketErr) {
    // Non-blocking socket notification
  }

  // If completed, automatically assign next queued applicant if one exists
  if (session.status === ASSISTANCE_STATUSES.COMPLETED) {
    await dispatchNextQueuedRequest(agentId);
  }

  return session;
}

/**
 * Update application progress stage
 */
async function updateApplicationStage(applicationId, agentId, { status, remarks }, userRole) {
  let application = await Application.findByPk(applicationId, {
    include: [
      { model: User, as: 'user' },
      { model: Job, as: 'job' },
      { model: AssistanceRequest, as: 'assistanceRequest' },
    ],
  });

  if (!application) {
    // Try finding via AssistanceRequest if session id was passed
    const ar = await AssistanceRequest.findByPk(applicationId);
    if (ar) {
      if (ar.applicationId) {
        application = await Application.findByPk(ar.applicationId, {
          include: [
            { model: User, as: 'user' },
            { model: Job, as: 'job' },
            { model: AssistanceRequest, as: 'assistanceRequest' },
          ],
        });
      } else {
        application = await Application.findOne({
          where: { assistanceRequestId: ar.id },
          include: [
            { model: User, as: 'user' },
            { model: Job, as: 'job' },
            { model: AssistanceRequest, as: 'assistanceRequest' },
          ],
        });
      }
    }
  }

  if (!application) {
    throw new AppError('Application record not found for stage update', 404);
  }

  const isAssigned = application.assignedAgentId === agentId || 
                     application.assistanceRequest?.assignedAgentId === agentId;

  if (!isAssigned && userRole !== 'ADMIN') {
    throw new AppError('Unauthorized: You are not assigned to this application', 403);
  }

  if (!application.assignedAgentId && agentId) {
    application.assignedAgentId = agentId;
  }

  let normalizedStatus = (status || '').toUpperCase();
  if (normalizedStatus === 'CANDIDATE_AUTHORIZATION_PENDING' || normalizedStatus === 'CANDIDATE_CONSENT') {
    normalizedStatus = APPLICATION_STATUSES.CANDIDATE_AUTHORIZATION_PENDING;
  }

  if (!ALL_APPLICATION_STATUSES.includes(normalizedStatus)) {
    throw new AppError(`Invalid application status: ${status}`, 400);
  }

  application.status = normalizedStatus;
  const history = Array.isArray(application.statusHistory) ? [...application.statusHistory] : [];
  history.push({
    status: normalizedStatus,
    timestamp: new Date().toISOString(),
    updatedBy: agentId,
    remarks: remarks || `Advanced to ${normalizedStatus}`,
  });
  application.statusHistory = history;

  await application.save();

  try {
    const { emitApplicationUpdate } = require('./socket.service');
    emitApplicationUpdate(application.id, application.toJSON());
  } catch (socketErr) {
    // Non-blocking socket notification
  }

  try {
    const { logAction } = require('./audit.service');
    const { AUDIT_ACTIONS } = require('../constants/audit.constant');
    await logAction({
      actorId: agentId,
      actorRole: userRole || 'AGENT',
      action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
      entityType: 'Application',
      entityId: application.id,
      metadata: {
        newStatus: normalizedStatus,
        remarks: remarks || `Advanced to ${normalizedStatus}`,
      },
    });
  } catch (auditErr) {
    console.warn('Could not log audit action for application stage update:', auditErr.message);
  }

  return application;
}

/**
 * Update live agent availability status (IDLE vs ASSISTING)
 */
async function updateAgentAvailability(agentUserId, { agentStatus }) {
  const normalizedStatus = (agentStatus || '').toUpperCase();
  if (!['IDLE', 'ASSISTING'].includes(normalizedStatus)) {
    throw new AppError('Invalid agent availability status. Must be IDLE or ASSISTING.', 400);
  }

  const profile = await Profile.findOne({ where: { userId: agentUserId } });
  if (!profile) {
    throw new AppError('Agent profile not found', 404);
  }

  profile.agentStatus = normalizedStatus;
  await profile.save();

  let assignedSession = null;
  if (normalizedStatus === 'IDLE') {
    assignedSession = await dispatchNextQueuedRequest(agentUserId);
    if (assignedSession) {
      await profile.reload();
    }
  }

  const { logAction } = require('./audit.service');
  const { AUDIT_ACTIONS } = require('../constants/audit.constant');
  await logAction({
    actorId: agentUserId,
    actorRole: 'AGENT',
    action: AUDIT_ACTIONS.AGENT_AVAILABILITY_CHANGED,
    entityType: 'Profile',
    entityId: profile.id,
    metadata: { agentStatus: profile.agentStatus },
  });

  return { agentStatus: profile.agentStatus, assignedSession };
}

/**
 * Directory of all active agents with their live availability and workload
 */
async function listAgentDirectory() {
  const agents = await User.findAll({
    where: { role: 'AGENT', status: 'ACTIVE' },
    attributes: ['id', 'email', 'status', 'createdAt'],
    include: [{ model: Profile, as: 'profile' }],
  });

  const agentIds = agents.map((a) => a.id);
  const activeSessions = await AssistanceRequest.findAll({
    attributes: [
      'assignedAgentId',
      [AssistanceRequest.sequelize.fn('COUNT', AssistanceRequest.sequelize.col('id')), 'count'],
    ],
    where: {
      assignedAgentId: { [Op.in]: agentIds },
      status: { [Op.in]: [ASSISTANCE_STATUSES.SCHEDULED, ASSISTANCE_STATUSES.IN_PROGRESS] },
    },
    group: ['assignedAgentId'],
    raw: true,
  });

  const sessionCounts = {};
  activeSessions.forEach((s) => {
    sessionCounts[s.assignedAgentId] = parseInt(s.count, 10) || 0;
  });

  return agents.map((agent) => ({
    id: agent.id,
    email: agent.email,
    fullName: agent.profile?.fullName || agent.email.split('@')[0],
    agentStatus: agent.profile?.agentStatus || 'IDLE',
    activeSessionsCount: sessionCounts[agent.id] || 0,
  }));
}

module.exports = {
  getAgentDashboard,
  getAgentSessions,
  getAgentApplications,
  updateSession,
  updateApplicationStage,
  updateAgentAvailability,
  dispatchNextQueuedRequest,
  listAgentDirectory,
};
