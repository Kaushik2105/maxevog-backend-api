/**
 * Application Routes
 */
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const {
  createApplicationValidator,
  updateStatusValidator,
  completeSubmissionValidator,
} = require('../validators/application.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAgentOrAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

router.post('/', authenticate, createApplicationValidator, validate, applicationController.createApplication);
router.get('/', authenticate, applicationController.getUserApplications);
router.get('/:id', authenticate, applicationController.getApplicationDetails);

// Student explicitly authorizes submission
router.patch('/:id/authorize-submission', authenticate, applicationController.authorizeSubmission);

// Agent/Admin completes submission with receipt document
router.post(
  '/:id/complete-submission',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('receipt'),
  completeSubmissionValidator,
  validate,
  applicationController.completeSubmission
);

// Controlled status update
router.patch(
  '/:id/status',
  authenticate,
  requireAgentOrAdmin,
  updateStatusValidator,
  validate,
  applicationController.updateStatus
);

// Document management for application
router.get('/:id/documents/:docId/view', authenticate, applicationController.viewDocument);
router.post('/:id/documents', authenticate, uploadSingle('document'), applicationController.uploadDocument);
router.delete('/:id/documents/:docId', authenticate, applicationController.deleteDocument);

module.exports = router;
