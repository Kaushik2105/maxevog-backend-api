/**
 * Application Service
 * Manages recruitment application tracking, status lifecycles, student submission authorization, and receipts.
 */
const { Application, Job, User, AssistanceRequest, Payment } = require('../models');
const { APPLICATION_STATUSES } = require('../constants/application.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { uploadDocument } = require('./upload.service');
const { logAction } = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

/**
 * Create a direct application tracking entry
 */
async function createApplication({ userId, jobId }) {
  const job = await Job.findByPk(jobId);
  if (!job || !job.isPublished) {
    throw new AppError('Recruitment job not found or not currently active', 404);
  }

  const existing = await Application.findOne({ where: { userId, jobId } });
  if (existing) {
    return existing;
  }

  return Application.create({
    userId,
    jobId,
    status: APPLICATION_STATUSES.INTERESTED,
  });
}

/**
 * List applications for an applicant
 */
async function getUserApplications(userId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { userId };

  if (query.status) {
    where.status = query.status;
  }

  const { count, rows } = await Application.findAndCountAll({
    where,
    include: [
      { model: Job, as: 'job' },
      { model: AssistanceRequest, as: 'assistanceRequest' },
      { model: Payment, as: 'payment' },
      { model: User, as: 'assignedAgent', attributes: ['id', 'email', 'role'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { applications: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Get application by ID with strict ownership validation
 */
async function getApplicationById(id, user) {
  const application = await Application.findByPk(id, {
    include: [
      { model: Job, as: 'job' },
      { model: AssistanceRequest, as: 'assistanceRequest' },
      { model: Payment, as: 'payment' },
      { model: User, as: 'assignedAgent', attributes: ['id', 'email', 'role'] },
      { model: User, as: 'user', attributes: ['id', 'email'] },
    ],
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const isOwner = application.userId === user.id;
  const isAssignedAgent = application.assignedAgentId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw new AppError('Forbidden: Access denied to this application', 403);
  }

  return application;
}

/**
 * Student explicitly authorizes final submission
 */
async function authorizeSubmission(id, userId) {
  const application = await Application.findOne({ where: { id, userId } });
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  application.submissionAuthorizedAt = new Date();
  application.status = APPLICATION_STATUSES.SUBMISSION_AUTHORIZED;
  await application.save();

  await logAction({
    actorId: userId,
    actorRole: 'USER',
    action: AUDIT_ACTIONS.APPLICATION_SUBMISSION_AUTHORIZED,
    entityType: 'Application',
    entityId: application.id,
  });

  return application;
}

/**
 * Agent / Admin completes final application submission and uploads receipt
 */
async function completeSubmission(id, { applicationNumber, examDate }, receiptBuffer, actor) {
  const application = await Application.findByPk(id);
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Ensure candidate authorized submission
  if (!application.submissionAuthorizedAt) {
    throw new AppError(
      'Cannot mark application as submitted: Student has not yet authorized final submission',
      400
    );
  }

  let receiptUrl = application.receiptUrl;
  if (receiptBuffer) {
    receiptUrl = await uploadDocument(receiptBuffer, 'receipts', `receipt_${id}`);
  }

  application.applicationNumber = applicationNumber || application.applicationNumber;
  application.status = APPLICATION_STATUSES.SUBMITTED;
  application.submittedAt = new Date();
  application.receiptUrl = receiptUrl;
  if (examDate) {
    application.examDate = examDate;
  }

  await application.save();

  // If linked to assistance request, mark assistance completed
  if (application.assistanceRequestId) {
    await AssistanceRequest.update(
      { status: 'COMPLETED', completedAt: new Date() },
      { where: { id: application.assistanceRequestId } }
    );
  }

  await logAction({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
    entityType: 'Application',
    entityId: application.id,
    metadata: { applicationNumber },
  });

  return application;
}

/**
 * Update general application status
 */
async function updateApplicationStatus(id, newStatus, actor) {
  const application = await Application.findByPk(id);
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (newStatus === APPLICATION_STATUSES.SUBMITTED && !application.submissionAuthorizedAt) {
    throw new AppError('Student must authorize final submission before status can be set to SUBMITTED', 400);
  }

  application.status = newStatus;
  await application.save();

  await logAction({
    actorId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
    entityType: 'Application',
    entityId: application.id,
    metadata: { status: newStatus },
  });

  return application;
}

module.exports = {
  createApplication,
  getUserApplications,
  getApplicationById,
  authorizeSubmission,
  completeSubmission,
  updateApplicationStatus,
};
