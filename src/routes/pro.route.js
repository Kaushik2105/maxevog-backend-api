/**
 * Pro Club Candidate Routes
 * Endpoints for Pro candidate opportunity protection and tracking
 */
const express = require('express');
const router = express.Router();
const proController = require('../controllers/pro.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All Pro Club candidate routes require authentication
router.use(authenticate);

// Pro Subscription Status & Activation
router.get('/status', proController.getStatus);
router.post('/activate', proController.activate);

// Personalized Matched Jobs Feed
router.get('/matches', proController.getMatchedJobs);
router.post('/matches/sync', proController.syncMatches);

// Personal Application Tracker & Deadline Center
router.get('/tracked', proController.getTracked);
router.post('/tracked/:jobId', proController.trackJob);
router.delete('/tracked/:jobId', proController.untrackJob);
router.patch('/tracked/:jobId/status', proController.updateTrackedStatus);
router.get('/deadlines', proController.getDeadlines);

// Notification Preferences & Telegram Linking
router.get('/preferences', proController.getPreferences);
router.put('/preferences', proController.updatePreferences);
router.post('/telegram/connect', proController.connectTelegram);
router.post('/telegram/disconnect', proController.disconnectTelegram);

module.exports = router;
