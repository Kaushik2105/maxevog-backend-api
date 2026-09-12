/**
 * Admin Dashboard & Governance Routes
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

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

// Desk Agents Workload Directory
router.get('/agents', adminController.listAgents);

// System Audit Logs
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;

