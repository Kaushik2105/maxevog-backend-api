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

router.post(
  '/',
  authenticate,
  requestAssistanceValidator,
  validate,
  assistanceController.requestAssistance
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
