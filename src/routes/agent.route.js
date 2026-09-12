/**
 * Desk Agent Routes
 */
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAgentOrAdmin } = require('../middleware/admin.middleware');

// Apply agent or admin authorization to all routes
router.use(authenticate, requireAgentOrAdmin);

// Dashboard overview & live queue
router.get('/dashboard', agentController.getDashboard);

// Sessions assigned to the agent
router.get('/sessions', agentController.getSessions);
router.patch('/sessions/:id', agentController.updateSession);

// Applications assigned to the agent
router.get('/applications', agentController.getApplications);
router.patch('/applications/:id/status', agentController.updateApplicationStage);

module.exports = router;
