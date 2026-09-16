/**
 * Assistance Validator
 */
const { body, param } = require('express-validator');
const { ALL_ASSISTANCE_STATUSES } = require('../constants/assistance.constant');

const requestAssistanceValidator = [
  body('jobId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val, { req }) => {
      if (!val && !req.body.customExamTitle) {
        throw new Error('Either a valid Job or a Custom Exam Title is required');
      }
      return true;
    }),
  body('customExamTitle').optional().trim().isLength({ max: 200 }),
  body('bookingDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val, { req }) => {
      const target = val || req.body.date;
      if (!target && !req.body.isUrgent) {
        throw new Error('A valid booking date (YYYY-MM-DD) is required');
      }
      return true;
    }),
  body('date').optional().trim(),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('isUrgent').optional().toBoolean(),
  body('urgencyReason').optional().trim().isLength({ max: 1000 }),
];

const assignAgentValidator = [
  param('id').isUUID(4).withMessage('Valid Assistance Request UUID required'),
  body('agentId').isUUID(4).withMessage('Valid Agent User UUID is required'),
  body('meetingLink').optional().trim().isURL().withMessage('Meeting link must be a valid URL'),
];

const updateAssistanceStatusValidator = [
  param('id').isUUID(4).withMessage('Valid Assistance Request UUID required'),
  body('status')
    .optional()
    .isIn(ALL_ASSISTANCE_STATUSES)
    .withMessage(`Status must be one of: ${ALL_ASSISTANCE_STATUSES.join(', ')}`),
  body('meetingLink').optional().trim().isURL().withMessage('Meeting link must be a valid URL'),
  body('notes').optional().trim(),
];

module.exports = {
  requestAssistanceValidator,
  assignAgentValidator,
  updateAssistanceStatusValidator,
};
