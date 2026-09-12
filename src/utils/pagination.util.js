/**
 * Pagination Utility
 * Normalizes query parameters and constructs pagination metadata.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Extract and validate pagination parameters from request query
 * @param {object} query 
 * @returns {{ page: number, limit: number, offset: number }}
 */
function getPaginationParams(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination metadata object
 * @param {object} params
 * @param {number} params.count - Total item count
 * @param {number} params.page - Current page number
 * @param {number} params.limit - Limit per page
 * @returns {object}
 */
function buildPaginationMeta({ count, page, limit }) {
  const totalPages = Math.ceil(count / limit) || 1;

  return {
    totalItems: count,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  getPaginationParams,
  buildPaginationMeta,
};
