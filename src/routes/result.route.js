/**
 * Result Routes
 */
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { createResultValidator, updateResultValidator } = require('../validators/result.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public routes
router.get('/', resultController.listResults);
router.get('/:id', resultController.getResult);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  createResultValidator,
  validate,
  resultController.createResult
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  updateResultValidator,
  validate,
  resultController.updateResult
);

router.patch('/:id/publish', authenticate, requireAdmin, resultController.publishResult);
router.delete('/:id', authenticate, requireAdmin, resultController.deleteResult);

module.exports = router;
