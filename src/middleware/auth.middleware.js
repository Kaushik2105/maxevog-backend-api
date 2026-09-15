/**
 * Authentication Middleware
 * Enforces JWT verification and checks user account status.
 */
const { verifyToken } = require('../utils/jwt.util');
const { sendError } = require('../utils/response.util');

const { User } = require('../models');

async function authenticate(req, res, next) {
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
    
    // Live verification of account status in database
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'status'],
    });

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Account not found or no longer active',
      });
    }

    if (String(user.status).toUpperCase() === 'SUSPENDED') {
      return sendError(res, {
        statusCode: 403,
        message: 'Your account has been suspended by administration. Access revoked.',
        data: { isSuspended: true },
      });
    }

    // Attach verified user payload
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
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
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'email', 'role', 'status'],
      });
      if (user && String(user.status).toUpperCase() !== 'SUSPENDED') {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      }
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
