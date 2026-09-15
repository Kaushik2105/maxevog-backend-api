/**
 * Admin Dashboard & Governance Routes
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

const { validate } = require('../middleware/validation.middleware');
const { createAgentValidator } = require('../validators/admin.validator');

const jobController = require('../controllers/job.controller');

// Apply admin authentication to all routes
router.use(authenticate, requireAdmin);

// Dashboard overview & charts
router.get('/dashboard/overview', adminController.getDashboardOverview);
router.get('/dashboard/user-growth', adminController.getUserGrowth);
router.get('/dashboard/application-stats', adminController.getApplicationStats);
router.get('/analytics/users', adminController.getUserGrowth);

// User Governance
router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

// Master Applications Ledger
router.get('/applications', adminController.listAllApplications);

// Financial Overview & Collections
router.get('/financials', adminController.getFinancialsOverview);

// Desk Agents Workload Directory & Agent Management
router.get('/agents', adminController.listAgents);
router.post('/agents', createAgentValidator, validate, adminController.createAgent);

// Recruitment Jobs Management (all statuses)
router.get('/jobs', jobController.listAdminJobs);

const feedbackController = require('../controllers/feedback.controller');

// Grievance Desk Feedback Submissions
router.get('/feedback', feedbackController.listAdminFeedbacks);
router.patch('/feedback/:id/resolve', feedbackController.respondToFeedback);
router.patch('/feedback/:id', feedbackController.respondToFeedback);

// System Audit Logs
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;

