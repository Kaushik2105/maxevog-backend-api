/**
 * Application Validator
 */
const { body, param } = require('express-validator');
const { ALL_APPLICATION_STATUSES } = require('../constants/application.constant');

const createApplicationValidator = [
  body('jobId').isUUID(4).withMessage('Valid recruitment job UUID is required'),
];

const updateStatusValidator = [
  param('id').isUUID(4).withMessage('Valid Application UUID required'),
  body('status')
    .isIn(ALL_APPLICATION_STATUSES)
    .withMessage(`Status must be one of: ${ALL_APPLICATION_STATUSES.join(', ')}`),
];

const completeSubmissionValidator = [
  param('id').isUUID(4).withMessage('Valid Application UUID required'),
  body('applicationNumber').trim().notEmpty().withMessage('Official application number is required'),
  body('examDate').optional().isISO8601().withMessage('Valid exam date required'),
];

module.exports = {
  createApplicationValidator,
  updateStatusValidator,
  completeSubmissionValidator,
};
