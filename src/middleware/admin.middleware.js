/**
 * Authorization Middleware
 * Enforces role-based access control.
 */
const { ROLES } = require('../constants/role.constant');
const { sendError } = require('../utils/response.util');

/**
 * Authorize specified roles
 * @param  {...string} allowedRoles 
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Unauthorized: Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        statusCode: 403,
        message: 'Forbidden: Insufficient privileges for this resource',
      });
    }

    next();
  };
}

const requireAdmin = authorize(ROLES.ADMIN);
const requireAgentOrAdmin = authorize(ROLES.ADMIN, ROLES.AGENT);

module.exports = {
  authorize,
  requireAdmin,
  requireAgentOrAdmin,
};
