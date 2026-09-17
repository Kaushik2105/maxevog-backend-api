/**
 * Job Routes
 */
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { createJobValidator, updateJobValidator } = require('../validators/job.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, requireAgentOrAdmin } = require('../middleware/admin.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

// Public & Admin listing routes
router.get('/', (req, res, next) => {
  if (req.baseUrl && req.baseUrl.includes('/admin/jobs')) {
    return authenticate(req, res, () => {
      return requireAgentOrAdmin(req, res, () => {
        return jobController.listAdminJobs(req, res, next);
      });
    });
  }
  return jobController.listPublicJobs(req, res, next);
});
router.get('/eligible/me', authenticate, jobController.getEligibleJobs);
router.get('/:id/eligibility', authenticate, jobController.checkJobEligibility);
router.get('/:id', jobController.getJobDetails);

// Admin & Specialist routes (mounted on /api/v1/jobs and /api/v1/admin/jobs)
router.get('/admin/all', authenticate, requireAgentOrAdmin, jobController.listAdminJobs);
router.post(
  '/',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  createJobValidator,
  validate,
  jobController.createJob
);

router.put(
  '/:id',
  authenticate,
  requireAgentOrAdmin,
  uploadSingle('attachment'),
  updateJobValidator,
  validate,
  jobController.updateJob
);

router.patch('/:id/publish', authenticate, requireAgentOrAdmin, jobController.publishJob);
router.patch('/:id/archive', authenticate, requireAgentOrAdmin, jobController.archiveJob);
router.delete('/:id', authenticate, requireAdmin, jobController.deleteJob);

module.exports = router;
