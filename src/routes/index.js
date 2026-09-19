/**
 * API v1 Router Registry
 * Mounts all domain routes with clean RESTful prefixes.
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.route');
const userRoutes = require('./user.route');
const jobRoutes = require('./job.route');
const resultRoutes = require('./result.route');
const admitCardRoutes = require('./admitCard.route');
const applicationRoutes = require('./application.route');
const assistanceRoutes = require('./assistance.route');
const membershipRoutes = require('./membership.route');
const notificationRoutes = require('./notification.route');
const feedbackRoutes = require('./feedback.route');
const paymentRoutes = require('./payment.route');
const adminRoutes = require('./admin.route');
const agentRoutes = require('./agent.route');
const proRoutes = require('./pro.route');

// Standard API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/results', resultRoutes);
router.use('/admit-cards', admitCardRoutes);
router.use('/applications', applicationRoutes);
router.use('/assistance', assistanceRoutes);
router.use('/membership', membershipRoutes);
router.use('/pro', proRoutes);
router.use('/notifications', notificationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/payments', paymentRoutes);
// Aliases for admin/specialist prefixes:
// Must be mounted BEFORE generic /admin so that agent authorization is not blocked by adminRoutes
router.use('/admin/jobs', jobRoutes);
router.use('/admin/results', resultRoutes);
router.use('/admin/admit-cards', admitCardRoutes);
router.use('/admin/assistance', assistanceRoutes);
router.use('/admin/memberships', membershipRoutes);
router.use('/admin/feedback', feedbackRoutes);

router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);

module.exports = router;
