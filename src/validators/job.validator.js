/**
 * Job Validator
 */
const { body, param, query } = require('express-validator');

const createJobValidator = [
  body('title').trim().notEmpty().withMessage('Recruitment title is required'),
  body('organization').trim().notEmpty().withMessage('Organization is required'),
  body('applicationLastDate')
    .custom((value, { req }) => {
      const targetDate = value || req.body.lastDate;
      if (!targetDate) {
        throw new Error('A valid last date (YYYY-MM-DD) is required');
      }
      const d = new Date(targetDate);
      if (isNaN(d.getTime())) {
        throw new Error('A valid last date (YYYY-MM-DD) is required');
      }
      req.body.applicationLastDate = targetDate;
      return true;
    }),
  body('ageMin').optional().toInt().isInt({ min: 14, max: 65 }),
  body('ageMax').optional().toInt().isInt({ min: 18, max: 70 }),
  body('vacancies').optional({ nullable: true, checkFalsy: true }).toInt().isInt({ min: 0 }),
  body('applicationFee').optional().toFloat().isFloat({ min: 0 }),
  body('fee').optional().toFloat().isFloat({ min: 0 }),
  body('officialApplicationUrl').optional().isURL().withMessage('Must be a valid URL'),
  body('officialNotificationUrl').optional().isURL().withMessage('Must be a valid URL'),
  body('officialUrl').optional().isURL().withMessage('Must be a valid URL'),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('tables').optional(),
  body('eligibleDegrees').optional(),
  body('eligibleBranches').optional(),
];

const updateJobValidator = [
  param('id').isUUID(4).withMessage('Valid Job UUID required'),
  body('title').optional().trim().notEmpty(),
  body('organization').optional().trim().notEmpty(),
  body('applicationLastDate').optional(),
  body('lastDate').optional(),
  body('officialApplicationUrl').optional().isURL(),
  body('officialNotificationUrl').optional().isURL(),
  body('officialUrl').optional().isURL(),
  body('category').optional().trim(),
  body('description').optional().trim(),
  body('tables').optional(),
  body('eligibleDegrees').optional(),
  body('eligibleBranches').optional(),
];

module.exports = {
  createJobValidator,
  updateJobValidator,
};
