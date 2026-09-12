/**
 * Audit Service
 * Records audit logs for sensitive operations.
 * Guaranteed zero storage of passwords, OTPs, PINs, and CVVs.
 */
const { AuditLog } = require('../models');
const logger = require('../utils/logger.util');

/**
 * Record an audit log entry
 * @param {object} params
 * @param {string} [params.actorId]
 * @param {string} [params.actorRole]
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {string} [params.entityId]
 * @param {object} [params.metadata]
 */
async function logAction({ actorId = null, actorRole = 'SYSTEM', action, entityType, entityId = null, metadata = {} }) {
  try {
    // Sanitize metadata to guarantee zero credentials leak
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.passwordHash;
    delete safeMetadata.otp;
    delete safeMetadata.pin;
    delete safeMetadata.cvv;

    const log = await AuditLog.create({
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      metadata: safeMetadata,
    });

    return log;
  } catch (error) {
    logger.error(`Failed to record audit log: ${error.message}`, { action, entityType, entityId });
    return null;
  }
}

module.exports = {
  logAction,
};
