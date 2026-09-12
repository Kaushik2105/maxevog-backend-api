/**
 * Result Validator
 */
const { body, param } = require('express-validator');

const createResultValidator = [
  body('title').trim().notEmpty().withMessage('Result title is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('jobId').optional().isUUID(4).withMessage('Valid Job UUID required if associated'),
  body('officialResultUrl').optional().isURL().withMessage('Must be a valid URL'),
  body('resultDate').optional().isISO8601().withMessage('Valid result date required'),
];

const updateResultValidator = [
  param('id').isUUID(4).withMessage('Valid Result UUID required'),
  body('title').optional().trim().notEmpty(),
  body('officialResultUrl').optional().isURL(),
];

module.exports = {
  createResultValidator,
  updateResultValidator,
};
