/**
 * Job Routes
 */
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { createJobValidator, updateJobValidator } = require('../validators/job.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public routes
router.get('/', jobController.listPublicJobs);
router.get('/eligible/me', authenticate, jobController.getEligibleJobs);
router.get('/:id', jobController.getJobDetails);

// Admin routes (mounted on /api/v1/jobs and /api/v1/admin/jobs)
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  createJobValidator,
  validate,
  jobController.createJob
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadSingle('attachment'),
  updateJobValidator,
  validate,
  jobController.updateJob
);

router.patch('/:id/publish', authenticate, requireAdmin, jobController.publishJob);
router.patch('/:id/archive', authenticate, requireAdmin, jobController.archiveJob);
router.delete('/:id', authenticate, requireAdmin, jobController.deleteJob);

module.exports = router;
