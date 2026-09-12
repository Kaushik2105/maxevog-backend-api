/**
 * Result Service
 * Business logic for recruitment results management.
 */
const { Result, Job } = require('../models');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { uploadDocument } = require('./upload.service');
const { logAction } = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

/**
 * List public results
 */
async function listResults(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { isPublished: true };

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  const { count, rows } = await Result.findAndCountAll({
    where,
    include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'organization'] }],
    order: [['resultDate', 'DESC']],
    limit,
    offset,
  });

  return { results: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Get result by ID
 */
async function getResultById(id) {
  const result = await Result.findByPk(id, {
    include: [{ model: Job, as: 'job' }],
  });

  if (!result) {
    throw new AppError('Result not found', 404);
  }

  return result;
}

/**
 * Admin: List all results (including unpublished)
 */
async function listAdminResults(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  if (query.isPublished !== undefined) {
    where.isPublished = query.isPublished === 'true';
  }

  const { count, rows } = await Result.findAndCountAll({
    where,
    include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'organization'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { results: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: Create result
 */
async function createResult(data, attachmentBuffer, actor) {
  let attachmentUrl = null;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'results', 'result');
  }

  const result = await Result.create({
    ...data,
    attachmentUrl: attachmentUrl || data.attachmentUrl,
  });

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_CREATED_RESULT,
    entityType: 'Result',
    entityId: result.id,
    metadata: { title: result.title, jobId: result.jobId },
  });

  return result;
}

/**
 * Admin: Update result
 */
async function updateResult(id, data, attachmentBuffer, actor) {
  const result = await Result.findByPk(id);
  if (!result) {
    throw new AppError('Result not found', 404);
  }

  let attachmentUrl = result.attachmentUrl;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'results', `result_${id}`);
  }

  await result.update({
    ...data,
    attachmentUrl,
  });

  return result;
}

/**
 * Admin: Toggle result publish status
 */
async function setPublishStatus(id, isPublished, actor) {
  const result = await Result.findByPk(id);
  if (!result) {
    throw new AppError('Result not found', 404);
  }

  result.isPublished = Boolean(isPublished);
  await result.save();

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_PUBLISHED_RESULT,
    entityType: 'Result',
    entityId: result.id,
    metadata: { isPublished: result.isPublished },
  });

  return result;
}

/**
 * Admin: Delete result
 */
async function deleteResult(id) {
  const result = await Result.findByPk(id);
  if (!result) {
    throw new AppError('Result not found', 404);
  }

  await result.destroy();
  return { deleted: true };
}

module.exports = {
  listResults,
  getResultById,
  listAdminResults,
  createResult,
  updateResult,
  setPublishStatus,
  deleteResult,
};
