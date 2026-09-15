/**
 * Admit Card Routes
 */
const express = require('express');
const router = express.Router();
const admitCardController = require('../controllers/admitCard.controller');
const {
  createAdmitCardValidator,
  updateAdmitCardValidator,
} = require('../validators/admitCard.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireAgentOrAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public routes
router.get('/', admitCardController.listAdmitCards);
router.get('/:id', admitCardController.getAdmitCard);

// Admin & Specialist routes
router.post(
  '/',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  createAdmitCardValidator,
  validate,
  admitCardController.createAdmitCard
);

router.put(
  '/:id',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  updateAdmitCardValidator,
  validate,
  admitCardController.updateAdmitCard
);

router.patch('/:id/publish', authenticate, requireAgentOrAdmin, admitCardController.publishAdmitCard);
router.delete('/:id', authenticate, requireAgentOrAdmin, admitCardController.deleteAdmitCard);

module.exports = router;
