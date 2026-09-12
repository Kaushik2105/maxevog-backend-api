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
const { requireAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public routes
router.get('/', admitCardController.listAdmitCards);
router.get('/:id', admitCardController.getAdmitCard);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  createAdmitCardValidator,
  validate,
  admitCardController.createAdmitCard
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  updateAdmitCardValidator,
  validate,
  admitCardController.updateAdmitCard
);

router.patch('/:id/publish', authenticate, requireAdmin, admitCardController.publishAdmitCard);
router.delete('/:id', authenticate, requireAdmin, admitCardController.deleteAdmitCard);

module.exports = router;
