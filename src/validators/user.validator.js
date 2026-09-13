/**
 * User & Profile Validator
 */
const { body } = require('express-validator');

const updateProfileValidator = [
  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('dob')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
  body('gender')
    .optional({ checkFalsy: true })
    .customSanitizer((v) => (v ? String(v).toUpperCase() : v))
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  body('mobileNumber')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Must be a valid 10-digit Indian phone number'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Must be a valid 10-digit Indian phone number'),
  body('category')
    .optional({ checkFalsy: true })
    .customSanitizer((v) => (v ? String(v).toUpperCase() : v))
    .isIn(['GENERAL', 'OBC', 'SC', 'ST', 'EWS'])
    .withMessage('Category must be GENERAL, OBC, SC, ST, or EWS'),
  body('passingYear')
    .optional({ checkFalsy: true })
    .isInt({ min: 1970, max: 2035 })
    .withMessage('Passing year must be between 1970 and 2035'),
  body('state').optional({ checkFalsy: true }).trim(),
  body('district').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),
  body('educationLevel').optional({ checkFalsy: true }).trim(),
  body('degree').optional({ checkFalsy: true }).trim(),
  body('branch').optional({ checkFalsy: true }).trim(),
  body('disabilityStatus').optional().isBoolean(),
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
