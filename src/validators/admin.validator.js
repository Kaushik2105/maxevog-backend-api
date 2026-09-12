/**
 * Admin Governance Validator
 */
const { body } = require('express-validator');

const createAgentValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Agent full name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('email')
    .isEmail()
    .withMessage('A valid official email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Initial password must be at least 6 characters long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number'),
];

module.exports = {
  createAgentValidator,
};
