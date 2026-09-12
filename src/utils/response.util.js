/**
 * Standard API Response Utility
 * Enforces consistent JSON response formats across all endpoints.
 */

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {object} options - Response options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message='Success'] - Human-readable success message
 * @param {any} [options.data=null] - Payload
 * @param {object} [options.meta=null] - Pagination or metadata
 */
function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta !== null && meta !== undefined) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {object} options - Response options
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {string} [options.message='An error occurred'] - Human-readable error message
 * @param {Array|object} [options.errors=null] - Specific validation errors or details
 */
function sendError(res, { statusCode = 500, message = 'An error occurred', errors = null } = {}) {
  const response = {
    success: false,
    message,
  };

  if (errors !== null && errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
