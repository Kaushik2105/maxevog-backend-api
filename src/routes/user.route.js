/**
 * User & Profile Routes
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const {
  updateProfileValidator,
  updatePreferencesValidator,
} = require('../validators/user.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const multer = require('multer');

// Support multiple files: avatar and resume
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const profileUploadMiddleware = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
]);

router.get('/profile', authenticate, userController.getProfile);
router.put(
  '/profile',
  authenticate,
  profileUploadMiddleware,
  updateProfileValidator,
  validate,
  userController.updateProfile
);

router.get('/preferences', authenticate, userController.getPreferences);
router.put(
  '/preferences',
  authenticate,
  updatePreferencesValidator,
  validate,
  userController.updatePreferences
);

module.exports = router;
