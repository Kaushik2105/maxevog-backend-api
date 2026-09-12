/**
 * Feedback Validator
 */
const { body, param } = require('express-validator');
const { ALL_FEEDBACK_TYPES, ALL_FEEDBACK_STATUSES } = require('../constants/feedback.constant');

const submitFeedbackValidator = [
  body('type')
    .isIn(ALL_FEEDBACK_TYPES)
    .withMessage(`Type must be one of: ${ALL_FEEDBACK_TYPES.join(', ')}`),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
];

const respondFeedbackValidator = [
  param('id').isUUID(4).withMessage('Valid Feedback UUID required'),
  body('status')
    .optional()
    .isIn(ALL_FEEDBACK_STATUSES)
    .withMessage(`Status must be one of: ${ALL_FEEDBACK_STATUSES.join(', ')}`),
  body('adminResponse').optional().trim().notEmpty(),
];

module.exports = {
  submitFeedbackValidator,
  respondFeedbackValidator,
};
