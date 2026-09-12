/**
 * Admit Card Validator
 */
const { body, param } = require('express-validator');

const createAdmitCardValidator = [
  body('title').trim().notEmpty().withMessage('Admit card title is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('jobId').optional().isUUID(4).withMessage('Valid Job UUID required if associated'),
  body('availabilityDate').optional().isISO8601().withMessage('Valid availability date required'),
  body('examDate').optional().isISO8601().withMessage('Valid exam date required'),
  body('officialAdmitCardUrl').optional().isURL().withMessage('Must be a valid URL'),
];

const updateAdmitCardValidator = [
  param('id').isUUID(4).withMessage('Valid Admit Card UUID required'),
  body('title').optional().trim().notEmpty(),
  body('officialAdmitCardUrl').optional().isURL(),
];

module.exports = {
  createAdmitCardValidator,
  updateAdmitCardValidator,
};
