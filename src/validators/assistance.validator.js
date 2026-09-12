/**
 * Assistance Validator
 */
const { body, param } = require('express-validator');
const { ALL_ASSISTANCE_STATUSES } = require('../constants/assistance.constant');

const requestAssistanceValidator = [
  body('jobId').isUUID(4).withMessage('Valid Job UUID is required'),
  body('preferredSlotId').isUUID(4).withMessage('Valid preferred time slot UUID is required'),
  body('notes').optional().trim().isLength({ max: 500 }),
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
