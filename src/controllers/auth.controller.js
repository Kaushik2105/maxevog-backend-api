/**
 * Auth Controller
 */
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response.util');

async function register(req, res, next) {
  try {
    const { email, password, fullName, mobileNumber } = req.body;
    const result = await authService.registerUser({ email, password, fullName, mobileNumber });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Current user fetched successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, oldPassword, newPassword);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function sendOtp(req, res, next) {
  try {
    const { email, fullName, name } = req.body;
    const candidateName = (fullName || name || '').trim();
    const result = await authService.sendRegistrationOtp({ email, fullName: candidateName });
    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyOtpRegister(req, res, next) {
  try {
    const { email, password, fullName, name, otp } = req.body;
    const candidateName = (fullName || name || '').trim();
    const result = await authService.verifyOtpAndRegister({ email, password, fullName: candidateName, otp });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Account created and verified successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { credential, email, fullName, avatarUrl, googleId } = req.body;
    const result = await authService.googleAuth({ credential, email, fullName, avatarUrl, googleId });
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Google authentication successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  sendOtp,
  verifyOtpRegister,
  googleAuth,
  login,
  me,
  logout,
  changePassword,
};
