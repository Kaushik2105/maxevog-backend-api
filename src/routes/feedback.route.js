/**
 * Feedback Routes
 */
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const {
  submitFeedbackValidator,
  respondFeedbackValidator,
} = require('../validators/feedback.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

router.post('/', optionalAuthenticate, submitFeedbackValidator, validate, feedbackController.submitFeedback);
router.get('/my', authenticate, feedbackController.getUserFeedbacks);

// Admin routes
router.get('/admin/list', authenticate, requireAdmin, feedbackController.listAdminFeedbacks);
router.patch(
  '/admin/:id',
  authenticate,
  requireAdmin,
  respondFeedbackValidator,
  validate,
  feedbackController.respondToFeedback
);

module.exports = router;
