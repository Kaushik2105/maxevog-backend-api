/**
 * Auth Validator
 */
const { body } = require('express-validator');

const registerValidator = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('mobileNumber')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number'),
];

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const changePasswordValidator = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
];

const sendOtpValidator = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
];

const verifyOtpRegisterValidator = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('otp')
    .trim()
    .isLength({ min: 4, max: 8 })
    .withMessage('A valid verification code is required'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
];

module.exports = {
  registerValidator,
  sendOtpValidator,
  verifyOtpRegisterValidator,
  loginValidator,
  changePasswordValidator,
};
