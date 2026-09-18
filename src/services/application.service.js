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
  const { Profile } = require('../models');
  const application = await Application.findByPk(id, {
    include: [
      { model: Job, as: 'job' },
      {
        model: AssistanceRequest,
        as: 'assistanceRequest',
        include: [
          {
            model: User,
            as: 'assignedAgent',
            attributes: ['id', 'email', 'role'],
            include: [{ model: Profile, as: 'profile' }],
          },
        ],
      },
      { model: Payment, as: 'payment' },
      {
        model: User,
        as: 'assignedAgent',
        attributes: ['id', 'email', 'role'],
        include: [{ model: Profile, as: 'profile' }],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile' }],
      },
    ],
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const isOwner = application.userId === user.id;
  const isAssignedAgent = application.assignedAgentId === user.id || application.assistanceRequest?.assignedAgentId === user.id;
  const isAgentOrAdmin = user.role === 'AGENT' || user.role === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAgentOrAdmin) {
    throw new AppError('Forbidden: Access denied to this application', 403);
  }

  const meta = typeof application.metadata === 'string'
    ? JSON.parse(application.metadata || '{}')
    : (application.metadata || {});
  const docs = Array.isArray(meta.documents) ? meta.documents : [];
  application.setDataValue('documents', docs);

  // Set assistanceSession compatibility object for client components
  if (application.assistanceRequest) {
    const ar = typeof application.assistanceRequest.toJSON === 'function'
      ? application.assistanceRequest.toJSON()
      : application.assistanceRequest;
    ar.meetingUrl = ar.meetingLink || ar.meetingUrl || null;
    ar.agentName = ar.assignedAgent?.profile?.fullName || ar.assignedAgent?.email || application.assignedAgent?.profile?.fullName || 'Senior Desk Officer';
    application.setDataValue('assistanceSession', ar);
  }

  return application;
}

/**
 * Upload student document to Cloudinary and attach to application
 */
async function addApplicationDocument(applicationId, file, user) {
  const application = await Application.findByPk(applicationId);
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const isOwner = application.userId === user.id;
  const isAssignedAgent = application.assignedAgentId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw new AppError('Forbidden: Access denied to upload documents for this application', 403);
  }

  if (!file || !file.buffer) {
    throw new AppError('No document file provided for upload', 400);
  }

  const { uploadApplicationDocument } = require('./upload.service');
  const uploadResult = await uploadApplicationDocument(file.buffer, file.originalname, applicationId);

  const { v4: uuidv4 } = require('uuid');
  const newDoc = {
    id: uuidv4(),
    name: file.originalname,
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.id,
  };

  const meta = typeof application.metadata === 'string'
    ? JSON.parse(application.metadata || '{}')
    : (application.metadata || {});

  const currentDocs = Array.isArray(meta.documents) ? meta.documents : [];
  currentDocs.push(newDoc);
  meta.documents = currentDocs;

  application.metadata = meta;
  await application.save();

  await logAction({
    actorId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.DOCUMENT_UPLOADED || 'DOCUMENT_UPLOADED',
    entityType: 'Application',
    entityId: application.id,
    metadata: { documentId: newDoc.id, documentName: newDoc.name },
  });

  return { document: newDoc, documents: currentDocs };
}

/**
 * Delete a document from Cloudinary and remove from application
 */
async function deleteApplicationDocument(applicationId, docId, user) {
  const application = await Application.findByPk(applicationId);
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const isOwner = application.userId === user.id;
  const isAssignedAgent = application.assignedAgentId === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAssignedAgent && !isAdmin) {
    throw new AppError('Forbidden: Access denied to modify documents for this application', 403);
  }

  const meta = typeof application.metadata === 'string'
    ? JSON.parse(application.metadata || '{}')
    : (application.metadata || {});

  const currentDocs = Array.isArray(meta.documents) ? meta.documents : [];
  const docIndex = currentDocs.findIndex((d) => d.id === docId);

  if (docIndex === -1) {
    throw new AppError('Document not found on this application', 404);
  }

  const [removedDoc] = currentDocs.splice(docIndex, 1);

  // Delete from Cloudinary
  if (removedDoc.publicId) {
    const { deleteFromCloudinary } = require('./upload.service');
    try {
      await deleteFromCloudinary(removedDoc.publicId);
    } catch (err) {
      console.error('Failed to remove file from Cloudinary:', err);
    }
  }

  meta.documents = currentDocs;
  application.metadata = meta;
  await application.save();

  await logAction({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DELETED',
    entityType: 'Application',
    entityId: application.id,
    metadata: { documentId: docId, documentName: removedDoc.name },
  });

  return { success: true, removedDocId: docId, documents: currentDocs };
}

/**
 * Student explicitly authorizes final submission
 */
async function authorizeSubmission(id, userId, body = {}) {
  const application = await Application.findOne({ where: { id, userId } });
  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const remarks = body.remarks || 'Candidate verified entered data & authorized official submission';

  application.submissionAuthorizedAt = new Date();
  application.status = APPLICATION_STATUSES.SUBMISSION_AUTHORIZED;

  const history = Array.isArray(application.statusHistory) ? [...application.statusHistory] : [];
  history.push({
    status: APPLICATION_STATUSES.SUBMISSION_AUTHORIZED,
    timestamp: new Date().toISOString(),
    updatedBy: userId,
    remarks,
  });
  application.statusHistory = history;

  await application.save();

  await logAction({
    actorId: userId,
    actorRole: 'USER',
    action: AUDIT_ACTIONS.APPLICATION_SUBMISSION_AUTHORIZED,
    entityType: 'Application',
    entityId: application.id,
    metadata: {
      remarks,
      verificationConfirmed: true,
    },
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
  addApplicationDocument,
  deleteApplicationDocument,
};
