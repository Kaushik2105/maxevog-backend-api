/**
 * Upload Service
 * Manages document and avatar uploads to Cloudinary and returns secure URLs.
 */
const cloudinary = require('../config/cloudinary.config');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<string>} Secure URL of uploaded resource
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured (e.g. tests or local initial setup), return simulated URL
    if (!envConfig.cloudinary.isConfigured) {
      const mockUrl = `https://res.cloudinary.com/mock-cloud/image/upload/v1/${options.folder || 'general'}/mock-${Date.now()}`;
      logger.info(`[Upload] Cloudinary credentials not configured; returning simulated URL: ${mockUrl}`);
      return resolve(mockUrl);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'gov_recruitment',
        resource_type: options.resource_type || 'auto',
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error: error.message });
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload student profile avatar
 * @param {Buffer} buffer 
 * @param {string} userId 
 * @returns {Promise<string>}
 */
async function uploadAvatar(buffer, userId) {
  return uploadBuffer(buffer, {
    folder: 'gov_recruitment/avatars',
    public_id: `avatar_${userId}_${Date.now()}`,
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  });
}

/**
 * Upload recruitment documents, application receipts, or notices
 * @param {Buffer} buffer 
 * @param {string} category 
 * @param {string} identifier 
 * @returns {Promise<string>}
 */
async function uploadDocument(buffer, category = 'documents', identifier = 'doc') {
  return uploadBuffer(buffer, {
    folder: `gov_recruitment/${category}`,
    public_id: `${identifier}_${Date.now()}`,
    resource_type: 'auto',
  });
}

module.exports = {
  uploadBuffer,
  uploadAvatar,
  uploadDocument,
};
