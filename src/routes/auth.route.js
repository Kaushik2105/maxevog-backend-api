/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  registerValidator,
  sendOtpValidator,
  verifyOtpRegisterValidator,
  loginValidator,
  changePasswordValidator,
} = require('../validators/auth.validator');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const userController = require('../controllers/user.controller');
const { updateProfileValidator } = require('../validators/user.validator');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const profileUploadMiddleware = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
]);

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/send-otp', authLimiter, sendOtpValidator, validate, authController.sendOtp);
router.post('/verify-otp-register', authLimiter, verifyOtpRegisterValidator, validate, authController.verifyOtpRegister);
router.post('/google', authLimiter, authController.googleAuth);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, profileUploadMiddleware, updateProfileValidator, validate, userController.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), userController.updateProfile);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, changePasswordValidator, validate, authController.changePassword);
router.put('/change-password', authenticate, changePasswordValidator, validate, authController.changePassword);

module.exports = router;
