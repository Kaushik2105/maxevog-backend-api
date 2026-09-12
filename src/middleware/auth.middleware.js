/**
 * Authentication Middleware
 * Enforces JWT verification and checks user account status.
 */
const { verifyToken } = require('../utils/jwt.util');
const { sendError } = require('../utils/response.util');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, {
      statusCode: 401,
      message: 'Access denied: No authentication token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Attach decoded user payload (id, email, role)
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, {
      statusCode: 401,
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }
}

/**
 * Optional Authentication
 * Attaches user if token is present and valid, but doesn't block unauthenticated requests.
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
};
