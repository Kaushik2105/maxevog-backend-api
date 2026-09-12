/**
 * Job Validator
 */
const { body, param, query } = require('express-validator');

const createJobValidator = [
  body('title').trim().notEmpty().withMessage('Recruitment title is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('applicationLastDate')
    .isISO8601()
    .withMessage('A valid last date (YYYY-MM-DD) is required'),
  body('ageMin').optional().isInt({ min: 14, max: 65 }),
  body('ageMax').optional().isInt({ min: 18, max: 70 }),
  body('vacancies').optional().isInt({ min: 1 }),
  body('applicationFee').optional().isFloat({ min: 0 }),
  body('officialApplicationUrl').optional().isURL().withMessage('Must be a valid URL'),
  body('officialNotificationUrl').optional().isURL().withMessage('Must be a valid URL'),
];

const updateJobValidator = [
  param('id').isUUID(4).withMessage('Valid Job UUID required'),
  body('title').optional().trim().notEmpty(),
  body('organization').optional().trim().notEmpty(),
  body('applicationLastDate').optional().isISO8601(),
  body('officialApplicationUrl').optional().isURL(),
  body('officialNotificationUrl').optional().isURL(),
];

module.exports = {
  createJobValidator,
  updateJobValidator,
};
