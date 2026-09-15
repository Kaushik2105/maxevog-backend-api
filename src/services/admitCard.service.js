/**
 * Admit Card Service
 * Business logic for admit card releases and exam schedules.
 */
const { AdmitCard, Job } = require('../models');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { uploadDocument } = require('./upload.service');
const { logAction } = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

function formatAdmitCard(card) {
  if (!card) return null;
  const json = typeof card.toJSON === 'function' ? card.toJSON() : { ...card };
  return {
    ...json,
    releaseDate: json.availabilityDate || json.releaseDate || null,
    downloadUrl: json.officialAdmitCardUrl || json.attachmentUrl || json.downloadUrl || null,
  };
}

/**
 * List public admit cards
 */
async function listAdmitCards(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { isPublished: true };

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  const { count, rows } = await AdmitCard.findAndCountAll({
    where,
    include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'organization'] }],
    order: [['availabilityDate', 'DESC']],
    limit,
    offset,
  });

  return { admitCards: rows.map(formatAdmitCard), meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Get admit card by ID
 */
async function getAdmitCardById(id) {
  const admitCard = await AdmitCard.findByPk(id, {
    include: [{ model: Job, as: 'job' }],
  });

  if (!admitCard) {
    throw new AppError('Admit card not found', 404);
  }

  return formatAdmitCard(admitCard);
}

/**
 * Admin: List all admit cards
 */
async function listAdminAdmitCards(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  if (query.isPublished !== undefined) {
    where.isPublished = query.isPublished === 'true';
  }

  const { count, rows } = await AdmitCard.findAndCountAll({
    where,
    include: [{ model: Job, as: 'job', attributes: ['id', 'title', 'organization'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { admitCards: rows.map(formatAdmitCard), meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: Create admit card
 */
async function createAdmitCard(data, attachmentBuffer, actor) {
  let attachmentUrl = null;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'admit_cards', 'admit_card');
  }

  const payload = {
    ...data,
    availabilityDate: data.availabilityDate || data.releaseDate || null,
    examDate: data.examDate || null,
    officialAdmitCardUrl: data.officialAdmitCardUrl || data.downloadUrl || null,
    attachmentUrl: attachmentUrl || data.attachmentUrl || data.downloadUrl || null,
    status: data.status || 'AVAILABLE',
    isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
  };

  const admitCard = await AdmitCard.create(payload);

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_CREATED_ADMIT_CARD,
    entityType: 'AdmitCard',
    entityId: admitCard.id,
    metadata: { title: admitCard.title, jobId: admitCard.jobId },
  });

  return formatAdmitCard(admitCard);
}

/**
 * Admin: Update admit card
 */
async function updateAdmitCard(id, data, attachmentBuffer, actor) {
  const admitCard = await AdmitCard.findByPk(id);
  if (!admitCard) {
    throw new AppError('Admit card not found', 404);
  }

  let attachmentUrl = admitCard.attachmentUrl;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'admit_cards', `admit_card_${id}`);
  }

  const payload = {
    ...data,
    ...(data.availabilityDate || data.releaseDate ? { availabilityDate: data.availabilityDate || data.releaseDate } : {}),
    ...(data.examDate ? { examDate: data.examDate } : {}),
    ...(data.officialAdmitCardUrl || data.downloadUrl ? { officialAdmitCardUrl: data.officialAdmitCardUrl || data.downloadUrl } : {}),
    attachmentUrl: attachmentUrl || (data.downloadUrl ? data.downloadUrl : admitCard.attachmentUrl),
  };

  await admitCard.update(payload);

  return formatAdmitCard(admitCard);
}

/**
 * Admin: Toggle publish status
 */
async function setPublishStatus(id, isPublished, actor) {
  const admitCard = await AdmitCard.findByPk(id);
  if (!admitCard) {
    throw new AppError('Admit card not found', 404);
  }

  admitCard.isPublished = Boolean(isPublished);
  await admitCard.save();

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_PUBLISHED_ADMIT_CARD,
    entityType: 'AdmitCard',
    entityId: admitCard.id,
    metadata: { isPublished: admitCard.isPublished },
  });

  return admitCard;
}

/**
 * Admin: Delete admit card
 */
async function deleteAdmitCard(id) {
  const admitCard = await AdmitCard.findByPk(id);
  if (!admitCard) {
    throw new AppError('Admit card not found', 404);
  }

  await admitCard.destroy();
  return { deleted: true };
}

module.exports = {
  listAdmitCards,
  getAdmitCardById,
  listAdminAdmitCards,
  createAdmitCard,
  updateAdmitCard,
  setPublishStatus,
  deleteAdmitCard,
};
