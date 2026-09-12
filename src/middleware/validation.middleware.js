/**
 * Validation Middleware
 * Checks express-validator results and returns standard 400 response on error.
 */
const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return sendError(res, {
      statusCode: 400,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
}

module.exports = {
  validate,
};
