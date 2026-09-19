/**
 * Assistance Request Service
 * Orchestrates the application assistance workflow, agent assignment, and Google Meet integration.
 * Guarantees zero storage of sensitive credentials/OTPs.
 */
const {
  AssistanceRequest,
  Application,
  Job,
  DailyAssistanceLimit,
  User,
  Profile,
  Payment,
  sequelize,
} = require('../models');
const { ASSISTANCE_STATUSES } = require('../constants/assistance.constant');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { PAYMENT_TYPES } = require('../constants/payment.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { checkAndReserveDailyCapacity } = require('./dailyAssistanceLimit.service');
const { createPayment } = require('./payment.service');
const { getCurrentMembership } = require('./membership.service');
const { logAction } = require('./audit.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const envConfig = require('../config/env.config');
const { AppError } = require('../middleware/error.middleware');

/**
 * Request application assistance
 */
async function requestAssistance({
  userId,
  jobId,
  customExamTitle,
  bookingDate,
  date,
  notes = '',
  isUrgent = false,
  urgencyReason = '',
}) {
  const targetDate = bookingDate || date || new Date().toISOString().split('T')[0];
  let job = null;
  let officialFee = 0;

  if (jobId && jobId !== 'OTHER') {
    job = await Job.findByPk(jobId);
    if (job) {
      officialFee = job.applicationFee || 0;
    }
  }

  // Active duplicate request check
  const whereCondition = {
    userId,
    status: [
      ASSISTANCE_STATUSES.REQUESTED,
      ASSISTANCE_STATUSES.URGENT_PENDING_REVIEW,
      ASSISTANCE_STATUSES.PAYMENT_PENDING,
      ASSISTANCE_STATUSES.PAID,
      ASSISTANCE_STATUSES.ASSIGNED,
      ASSISTANCE_STATUSES.SCHEDULED,
      ASSISTANCE_STATUSES.IN_PROGRESS,
    ],
  };

  if (job) {
    whereCondition.jobId = job.id;
  } else if (customExamTitle) {
    whereCondition.customExamTitle = customExamTitle;
  }

  const existingRequest = await AssistanceRequest.findOne({ where: whereCondition });
  if (existingRequest) {
    throw new AppError('You already have an active assistance request for this recruitment/examination', 400);
  }

  const proSubscriptionService = require('./proSubscription.service');
  const proStatus = await proSubscriptionService.getProStatus(userId);
  const hasFreeCredit = proStatus.isPro && proStatus.assistanceCredits.available;

  // Urgent vs Standard fee calculation (1 Free Pro Assistance Credit covers the ₹69 service fee)
  let serviceFee = hasFreeCredit ? 0 : (envConfig.business.defaultAssistanceFee || 69);
  let priorityFee = 0;

  if (isUrgent) {
    priorityFee = 30; // ₹30 urgent deadline priority surcharge
  }

  const totalAmount = serviceFee + priorityFee; // ₹0 standard with Pro Credit, ₹30 urgent with Pro Credit

  return sequelize.transaction(async (t) => {
    if (hasFreeCredit) {
      await proSubscriptionService.consumeAssistanceCredit(userId, t);
    }

    let scheduledDateTime = null;
    let initialStatus = ASSISTANCE_STATUSES.SCHEDULED;
    let initialAppStatus = APPLICATION_STATUSES.SCHEDULED;

    if (isUrgent) {
      // Urgent requests are submitted for admin/agent accommodation review (not auto-scheduled)
      initialStatus = ASSISTANCE_STATUSES.URGENT_PENDING_REVIEW;
      initialAppStatus = APPLICATION_STATUSES.DRAFT;
    } else {
      // Standard booking: check and reserve daily capacity
      await checkAndReserveDailyCapacity(targetDate, t);
      scheduledDateTime = new Date(`${targetDate}T10:00:00`);
    }

    // Check if an active agent is idle and available
    let assignedAgentId = null;
    let assignedAgent = null;

    const idleAgent = await User.findOne({
      where: { role: 'AGENT', status: 'ACTIVE' },
      include: [
        {
          model: Profile,
          as: 'profile',
          where: { agentStatus: 'IDLE' },
        },
      ],
      order: [['updatedAt', 'ASC']],
      transaction: t,
    });

    if (idleAgent) {
      assignedAgentId = idleAgent.id;
      assignedAgent = idleAgent;
      initialStatus = ASSISTANCE_STATUSES.ASSIGNED;
      initialAppStatus = APPLICATION_STATUSES.IN_PROGRESS;

      // Transition agent status to ASSISTING so they aren't double booked
      if (idleAgent.profile) {
        idleAgent.profile.agentStatus = 'ASSISTING';
        await idleAgent.profile.save({ transaction: t });
      }
    }

    // 1. Create assistance request record
    const assistanceRequest = await AssistanceRequest.create(
      {
        userId,
        jobId: job ? job.id : null,
        customExamTitle: job ? null : (customExamTitle || 'Government Examination'),
        bookingDate: targetDate,
        isUrgent: Boolean(isUrgent),
        urgencyReason: urgencyReason || null,
        officialFee,
        serviceFee,
        priorityFee,
        totalAmount,
        notes,
        status: initialStatus,
        assignedAgentId,
        scheduledAt: scheduledDateTime,
      },
      { transaction: t }
    );

    // 2. Create linked tracking application
    const application = await Application.create(
      {
        userId,
        jobId: job ? job.id : null,
        assistanceRequestId: assistanceRequest.id,
        assignedAgentId,
        status: initialAppStatus,
      },
      { transaction: t }
    );

    assistanceRequest.applicationId = application.id;
    await assistanceRequest.save({ transaction: t });

    // 3. Create payment record
    const payment = await createPayment(
      {
        userId,
        paymentType: PAYMENT_TYPES.ASSISTANCE,
        officialFee,
        serviceFee,
        totalAmount,
        applicationId: application.id,
        assistanceRequestId: assistanceRequest.id,
      },
      { transaction: t }
    );

    if (!isUrgent) {
      payment.status = 'SUCCESS';
      await payment.save({ transaction: t });
    }

    return {
      id: assistanceRequest.id,
      applicationId: application.id,
      bookingDate: assistanceRequest.bookingDate,
      status: assistanceRequest.status,
      officialFee: assistanceRequest.officialFee,
      serviceFee: assistanceRequest.serviceFee,
      priorityFee: assistanceRequest.priorityFee,
      totalAmount: assistanceRequest.totalAmount,
      assignedAgentId: assistanceRequest.assignedAgentId,
      assignedAgent: assignedAgent
        ? {
            id: assignedAgent.id,
            name: assignedAgent.profile?.fullName || assignedAgent.email.split('@')[0],
            email: assignedAgent.email,
          }
        : null,
      confirmed: !isUrgent,
      message: isUrgent
        ? 'Urgent assistance request submitted for immediate review. Our desk team will contact you.'
        : assignedAgent
        ? 'Assistance session booked! Desk specialist assigned.'
        : 'Assistance request queued! A specialist will be assigned as soon as available.',
      assistanceRequest: {
        id: assistanceRequest.id,
        userId: assistanceRequest.userId,
        jobId: assistanceRequest.jobId,
        bookingDate: assistanceRequest.bookingDate,
        status: assistanceRequest.status,
        officialFee: assistanceRequest.officialFee,
        serviceFee: assistanceRequest.serviceFee,
        totalAmount: assistanceRequest.totalAmount,
        assignedAgentId: assistanceRequest.assignedAgentId,
      },
      payment: {
        id: payment.id,
        totalAmount: payment.totalAmount,
        serviceFee: payment.serviceFee,
        status: payment.status,
      },
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
