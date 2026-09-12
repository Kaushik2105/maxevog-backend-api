/**
 * Time Slot Routes
 */
const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlot.controller');
const {
  createTimeSlotValidator,
  updateTimeSlotValidator,
} = require('../validators/timeSlot.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

// Public/authenticated slot checking
router.get('/', timeSlotController.listAvailableSlots);

// Admin slot management
router.get('/admin', authenticate, requireAdmin, timeSlotController.listAdminSlots);
router.post('/', authenticate, requireAdmin, createTimeSlotValidator, validate, timeSlotController.createSlot);
router.put('/:id', authenticate, requireAdmin, updateTimeSlotValidator, validate, timeSlotController.updateSlot);
router.delete('/:id', authenticate, requireAdmin, timeSlotController.deleteSlot);

module.exports = router;
