/**
 * Centralized Error Handling Middleware
 * Gracefully handles domain exceptions, Sequelize errors, JWT errors, and unhandled errors.
 * Guarantees zero stack-trace leakage in production.
 */
const { sendError } = require('../utils/response.util');
const logger = require('../utils/logger.util');
const envConfig = require('../config/env.config');

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 Route Not Found
 */
function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global Error Handler
 */
function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    url: req.originalUrl,
    method: req.method,
    stack: envConfig.app.isProduction ? undefined : err.stack,
  });

  // Handle express-validator / AppError
  if (err instanceof AppError) {
    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // Handle Sequelize Validation Errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, {
      statusCode: 400,
      message: 'Validation failed',
      errors,
    });
  }

  // Handle Sequelize Unique Constraint Violation
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
    }));
    return sendError(res, {
      statusCode: 409,
      message: 'Resource conflict: Duplicate value provided',
      errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, {
      statusCode: 401,
      message: 'Invalid authorization token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, {
      statusCode: 401,
      message: 'Authorization token has expired',
    });
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return sendError(res, {
      statusCode: 400,
      message: `File upload error: ${err.message}`,
    });
  }

  // Unhandled / Internal Server Errors
  const statusCode = err.statusCode || 500;
  const message = envConfig.app.isProduction ? 'Internal server error' : err.message || 'Internal server error';

  return sendError(res, {
    statusCode,
    message,
    errors: envConfig.app.isProduction ? null : err.stack,
  });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
