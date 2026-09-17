/**
 * Upload Service
 * Manages document and avatar uploads to Cloudinary and returns secure URLs.
 */
const cloudinary = require('../config/cloudinary.config');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

/**
 * Upload buffer to Cloudinary and return secure URL
 * @param {Buffer} buffer - File buffer from multer
 * @param {object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<string>} Secure URL of uploaded resource
 */
function uploadBuffer(buffer, options = {}) {
  return uploadBufferDetails(buffer, options).then((res) => res.url);
}

/**
 * Upload buffer to Cloudinary and return full result details (URL + publicId)
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number, resourceType: string }>}
 */
function uploadBufferDetails(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!envConfig.cloudinary.isConfigured) {
      const mockId = `mock-${Date.now()}`;
      const mockUrl = `https://res.cloudinary.com/mock-cloud/image/upload/v1/${options.folder || 'general'}/${mockId}`;
      logger.info(`[Upload] Cloudinary credentials not configured; returning simulated URL: ${mockUrl}`);
      return resolve({
        url: mockUrl,
        publicId: mockId,
        format: 'pdf',
        bytes: buffer ? buffer.length : 1024,
        resourceType: 'auto',
      });
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
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by its publicId
 * @param {string} publicId
 * @param {string} resourceType
 * @returns {Promise<object>}
 */
async function deleteFromCloudinary(publicId, resourceType = 'auto') {
  if (!publicId) return { result: 'not_found' };

  if (!envConfig.cloudinary.isConfigured) {
    logger.info(`[Upload] Cloudinary not configured; mock delete: ${publicId}`);
    return { result: 'ok' };
  }

  try {
    // Try auto/image first
    let res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (res.result === 'ok') return res;

    // If not found as image, try as raw (e.g. PDF/DOCX)
    res = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return res;
  } catch (err) {
    logger.error('Cloudinary destroy error', { error: err.message, publicId });
    throw err;
  }
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

/**
 * Upload student recruitment document with full metadata
 * @param {Buffer} buffer 
 * @param {string} originalName 
 * @param {string} applicationId 
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadApplicationDocument(buffer, originalName, applicationId) {
  const sanitizedName = (originalName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadBufferDetails(buffer, {
    folder: 'gov_recruitment/application_docs',
    public_id: `app_${applicationId}_${Date.now()}_${sanitizedName}`,
    resource_type: 'auto',
  });
}

module.exports = {
  uploadBuffer,
  uploadBufferDetails,
  deleteFromCloudinary,
  uploadAvatar,
  uploadDocument,
  uploadApplicationDocument,
};
