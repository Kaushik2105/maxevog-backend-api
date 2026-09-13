/**
 * Membership Routes
 */
const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membership.controller');
const { purchaseMembershipValidator } = require('../validators/membership.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

router.get('/', authenticate, membershipController.getCurrentMembership);
router.get('/current', authenticate, membershipController.getCurrentMembership);

router.post(
  '/purchase',
  authenticate,
  purchaseMembershipValidator,
  validate,
  membershipController.purchaseMembership
);
router.post(
  '/subscribe',
  authenticate,
  purchaseMembershipValidator,
  validate,
  membershipController.purchaseMembership
);
router.post('/verify-payment', authenticate, membershipController.verifyPayment);

router.get('/history', authenticate, membershipController.getHistory);

// Admin routes
router.get('/admin/list', authenticate, requireAdmin, membershipController.listAdminMemberships);
router.get('/admin/paid-members', authenticate, requireAdmin, membershipController.listPaidMembers);
router.get('/admin/stats', authenticate, requireAdmin, membershipController.getStats);

module.exports = router;
