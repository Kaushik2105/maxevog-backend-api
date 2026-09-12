/**
 * Rate Limiter Middleware
 * Protects against brute-force attacks and abuse.
 */
const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response.util');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    });
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      message: 'Too many requests from this IP. Please slow down.',
    });
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
};
