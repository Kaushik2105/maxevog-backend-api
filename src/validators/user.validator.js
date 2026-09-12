/**
 * User & Profile Validator
 */
const { body } = require('express-validator');

const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('dob')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  body('mobileNumber')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Must be a valid 10-digit Indian phone number'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'OBC', 'SC', 'ST', 'EWS'])
    .withMessage('Category must be GENERAL, OBC, SC, ST, or EWS'),
  body('passingYear')
    .optional()
    .isInt({ min: 1970, max: 2035 })
    .withMessage('Passing year must be between 1970 and 2035'),
  body('experienceYears')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Experience years must be between 0 and 50'),
];

const updatePreferencesValidator = [
  body('emailEnabled').optional().isBoolean(),
  body('telegramEnabled').optional().isBoolean(),
  body('telegramChatId').optional().trim(),
  body('deadlineAlerts').optional().isBoolean(),
  body('admitCardAlerts').optional().isBoolean(),
  body('examAlerts').optional().isBoolean(),
  body('resultAlerts').optional().isBoolean(),
];

module.exports = {
  updateProfileValidator,
  updatePreferencesValidator,
};
