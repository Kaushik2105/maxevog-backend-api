/**
 * Result Routes
 */
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { createResultValidator, updateResultValidator } = require('../validators/result.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireAgentOrAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public routes
router.get('/', resultController.listResults);
router.get('/:id', resultController.getResult);

// Admin & Specialist routes
router.post(
  '/',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  createResultValidator,
  validate,
  resultController.createResult
);

router.put(
  '/:id',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  updateResultValidator,
  validate,
  resultController.updateResult
);

router.patch('/:id/publish', authenticate, requireAgentOrAdmin, resultController.publishResult);
router.delete('/:id', authenticate, requireAgentOrAdmin, resultController.deleteResult);

module.exports = router;
