/**
 * Assistance Request Service
 * Orchestrates the application assistance workflow, agent assignment, and Google Meet integration.
 * Guarantees zero storage of sensitive credentials/OTPs.
 */
const {
  AssistanceRequest,
  Application,
  Job,
  TimeSlot,
  User,
  Payment,
  sequelize,
} = require('../models');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { PAYMENT_TYPES } = require('../constants/payment.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { reserveSlot } = require('./timeSlot.service');
const { createPayment } = require('./payment.service');
const { getCurrentMembership } = require('./membership.service');
const { logAction } = require('./audit.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const envConfig = require('../config/env.config');
const { AppError } = require('../middleware/error.middleware');

/**
 * Request application assistance
 */
async function requestAssistance({ userId, jobId, preferredSlotId, notes = '' }) {
  const job = await Job.findByPk(jobId);
  if (!job || !job.isPublished) {
    throw new AppError('The selected recruitment is not active or available for assistance', 404);
  }

  // Check for existing pending/active assistance request for this job
  const existingRequest = await AssistanceRequest.findOne({
    where: {
      userId,
      jobId,
      status: [
        ASSISTANCE_STATUSES.REQUESTED,
        ASSISTANCE_STATUSES.PAYMENT_PENDING,
        ASSISTANCE_STATUSES.PAID,
        ASSISTANCE_STATUSES.ASSIGNED,
        ASSISTANCE_STATUSES.SCHEDULED,
        ASSISTANCE_STATUSES.IN_PROGRESS,
      ],
    },
  });

  if (existingRequest) {
    throw new AppError('You already have an active assistance request for this recruitment', 400);
  }

  const { hasActiveMembership: isPro } = await getCurrentMembership(userId);
  const officialFee = job.applicationFee || 0;
  const serviceFee = isPro ? 0 : (envConfig.business.defaultAssistanceFee || 69);
  // Only charge the platform desk service fee (69 or 0 for Pro).
  // Official board application fee is paid directly by candidate on the govt portal during session.
  const totalAmount = serviceFee;

  return sequelize.transaction(async (t) => {
    // 1. Reserve selected slot
    const slot = await reserveSlot(preferredSlotId, t);
    const scheduledDateTime = new Date(`${slot.date}T${slot.startTime}:00`);

    const initialStatus = totalAmount === 0 ? ASSISTANCE_STATUSES.SCHEDULED : ASSISTANCE_STATUSES.PAYMENT_PENDING;
    const initialAppStatus = totalAmount === 0 ? APPLICATION_STATUSES.PROCESSING : APPLICATION_STATUSES.PAYMENT_PENDING;

    // 2. Create assistance request record
    const assistanceRequest = await AssistanceRequest.create(
      {
        userId,
        jobId,
        preferredSlotId,
        officialFee,
        serviceFee,
        totalAmount,
        notes,
        status: initialStatus,
        scheduledAt: scheduledDateTime,
      },
      { transaction: t }
    );

    // 3. Create linked tracking application
    const application = await Application.create(
      {
        userId,
        jobId,
        assistanceRequestId: assistanceRequest.id,
        status: initialAppStatus,
      },
      { transaction: t }
    );

    assistanceRequest.applicationId = application.id;
    await assistanceRequest.save({ transaction: t });

    // 4. Create payment record
    const payment = await createPayment({
      userId,
      paymentType: PAYMENT_TYPES.ASSISTANCE,
      officialFee,
      serviceFee,
      totalAmount,
      applicationId: application.id,
      assistanceRequestId: assistanceRequest.id,
    });

    if (totalAmount === 0) {
      payment.status = 'SUCCESS';
      await payment.save();
    }

    return {
      assistanceRequest,
      application,
      payment,
    };
  });
}

/**
 * List user's assistance requests
 */
async function getUserAssistanceRequests(userId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);

  const { count, rows } = await AssistanceRequest.findAndCountAll({
    where: { userId },
    include: [
      { model: Job, as: 'job', attributes: ['id', 'title', 'organization', 'applicationLastDate'] },
      { model: TimeSlot, as: 'preferredSlot' },
      { model: Application, as: 'application' },
      { model: User, as: 'assignedAgent', attributes: ['id', 'email', 'role'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { requests: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Get assistance request details with role-based ownership validation
 */
async function getAssistanceRequestById(id, user) {
  const assistance = await AssistanceRequest.findByPk(id, {
    include: [
      { model: Job, as: 'job' },
      { model: TimeSlot, as: 'preferredSlot' },
      { model: Application, as: 'application' },
      { model: User, as: 'assignedAgent', attributes: ['id', 'email', 'role'] },
      { model: User, as: 'user', attributes: ['id', 'email'] },
      { model: Payment, as: 'payment' },
    ],
  });

  if (!assistance) {
    throw new AppError('Assistance request not found', 404);
  }

  // Restrict access: Student owns it, assigned agent, or admin
  const isOwner = assistance.userId === user.id;
  const isAssignedAgent = assistance.assignedAgentId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw new AppError('Forbidden: You do not have permission to view this assistance request', 403);
  }

  return assistance;
}

/**
 * Admin: Assign agent and set meeting link
 */
async function assignAgent(id, { agentId, meetingLink = null }, actor) {
  const assistance = await AssistanceRequest.findByPk(id);
  if (!assistance) {
    throw new AppError('Assistance request not found', 404);
  }

  const agent = await User.findByPk(agentId);
  if (!agent || (agent.role !== 'AGENT' && agent.role !== 'ADMIN')) {
    throw new AppError('Invalid agent specified', 400);
  }

  assistance.assignedAgentId = agentId;
  if (meetingLink) {
    assistance.meetingLink = meetingLink;
  }
  assistance.status = ASSISTANCE_STATUSES.ASSIGNED;
  await assistance.save();

  // Also update linked application
  if (assistance.applicationId) {
    await Application.update(
      { assignedAgentId: agentId, status: APPLICATION_STATUSES.SCHEDULED },
      { where: { id: assistance.applicationId } }
    );
  }

  await logAction({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.ASSISTANCE_ASSIGNED,
    entityType: 'AssistanceRequest',
    entityId: assistance.id,
    metadata: { agentId, meetingLink },
  });

  return assistance;
}

/**
 * Admin/Agent: Update assistance status
 */
async function updateAssistanceStatus(id, { status, notes, meetingLink }, actor) {
  const assistance = await AssistanceRequest.findByPk(id);
  if (!assistance) {
    throw new AppError('Assistance request not found', 404);
  }

  // Agents can only modify assigned requests
  if (actor.role === 'AGENT' && assistance.assignedAgentId !== actor.id) {
    throw new AppError('Forbidden: You are not assigned to this assistance session', 403);
  }

  if (status) {
    assistance.status = status;
    if (status === ASSISTANCE_STATUSES.IN_PROGRESS && !assistance.startedAt) {
      assistance.startedAt = new Date();
    } else if (status === ASSISTANCE_STATUSES.COMPLETED && !assistance.completedAt) {
      assistance.completedAt = new Date();
    }
  }

  if (notes !== undefined) assistance.notes = notes;
  if (meetingLink !== undefined) assistance.meetingLink = meetingLink;

  await assistance.save();

  await logAction({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.ASSISTANCE_STATUS_CHANGED,
    entityType: 'AssistanceRequest',
    entityId: assistance.id,
    metadata: { status: assistance.status },
  });

  return assistance;
}

/**
 * Admin: List assistance requests by status or filters
 */
async function listAdminAssistance(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.assignedAgentId) {
    where.assignedAgentId = query.assignedAgentId;
  }

  const { count, rows } = await AssistanceRequest.findAndCountAll({
    where,
    include: [
      { model: Job, as: 'job', attributes: ['id', 'title', 'organization'] },
      { model: User, as: 'user', attributes: ['id', 'email'] },
      { model: User, as: 'assignedAgent', attributes: ['id', 'email'] },
      { model: TimeSlot, as: 'preferredSlot' },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { requests: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

module.exports = {
  requestAssistance,
  getUserAssistanceRequests,
  getAssistanceRequestById,
  assignAgent,
  updateAssistanceStatus,
  listAdminAssistance,
};
