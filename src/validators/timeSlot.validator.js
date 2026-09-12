/**
 * Time Slot Validator
 */
const { body, param } = require('express-validator');

const createTimeSlotValidator = [
  body('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be HH:MM format (e.g. 10:00)'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be HH:MM format (e.g. 11:00)'),
  body('maxCapacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
];

const updateTimeSlotValidator = [
  param('id').isUUID(4).withMessage('Valid TimeSlot UUID required'),
  body('date').optional().isISO8601(),
  body('startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('endTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('maxCapacity').optional().isInt({ min: 1 }),
];

module.exports = {
  createTimeSlotValidator,
  updateTimeSlotValidator,
};
