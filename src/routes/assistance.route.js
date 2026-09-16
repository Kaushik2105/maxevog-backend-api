/**
 * Assistance Request Routes
 */
const express = require('express');
const router = express.Router();
const assistanceController = require('../controllers/assistance.controller');
const {
  requestAssistanceValidator,
  assignAgentValidator,
  updateAssistanceStatusValidator,
} = require('../validators/assistance.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireAgentOrAdmin } = require('../middleware/admin.middleware');

// Public/candidate availability inspection
router.get('/availability', async (req, res, next) => {
  try {
    const dailyAssistanceLimitService = require('../services/dailyAssistanceLimit.service');
    const availability = await dailyAssistanceLimitService.getDailyAvailability(
      req.query.startDate,
      req.query.days ? parseInt(req.query.days, 10) : 14
    );
    return res.status(200).json({ success: true, data: { availability } });
  } catch (err) {
    next(err);
  }
});

// Book assistance sessions (mounted on both / and /book for exact API parity)
router.post(
  '/',
  authenticate,
  requestAssistanceValidator,
  validate,
  assistanceController.requestAssistance
);

router.post(
  '/book',
  authenticate,
  requestAssistanceValidator,
  validate,
  assistanceController.requestAssistance
);

// Submit urgent assistance request when date capacity is full
router.post(
  '/urgent',
  authenticate,
  requestAssistanceValidator,
  validate,
  (req, res, next) => {
    req.body.isUrgent = true;
    return assistanceController.requestAssistance(req, res, next);
  }
);

router.get('/', authenticate, assistanceController.getUserRequests);
router.get('/:id', authenticate, assistanceController.getRequestDetails);

// Admin & Agent operational routes
router.get('/admin/list', authenticate, requireAgentOrAdmin, assistanceController.listAdminAssistance);

router.patch(
  '/:id/assign-agent',
  authenticate,
  requireAdmin,
  assignAgentValidator,
  validate,
  assistanceController.assignAgent
);

router.patch(
  '/:id/status',
  authenticate,
  requireAgentOrAdmin,
  updateAssistanceStatusValidator,
  validate,
  assistanceController.updateStatus
);

module.exports = router;
