/**
 * User & Profile Controller
 */
const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/response.util');

async function getProfile(req, res, next) {
  try {
    const profile = await userService.getProfile(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile fetched successfully',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const files = {};
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        files.avatar = req.files.avatar[0];
      }
      if (req.files.resume && req.files.resume[0]) {
        files.resume = req.files.resume[0];
      }
    } else if (req.file) {
      // Single file upload
      files[req.file.fieldname] = req.file;
    }

    const updatedProfile = await userService.updateProfile(req.user.id, req.body, files);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile updated successfully',
      data: { profile: updatedProfile },
    });
  } catch (error) {
    next(error);
  }
}

async function getPreferences(req, res, next) {
  try {
    const preferences = await userService.getPreferences(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification preferences fetched successfully',
      data: { preferences },
    });
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const updated = await userService.updatePreferences(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification preferences updated successfully',
      data: { preferences: updated },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
};
