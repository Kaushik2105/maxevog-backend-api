/**
 * Notification Routes
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

router.get('/', authenticate, notificationController.getUserNotifications);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

// Admin trigger endpoints
router.post('/admin/broadcast', authenticate, requireAdmin, notificationController.triggerBroadcast);
router.post('/admin/send', authenticate, requireAdmin, notificationController.triggerUserNotification);

module.exports = router;
