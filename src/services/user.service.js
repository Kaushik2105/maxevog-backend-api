/**
 * User & Profile Service
 * Manages user profile information, Cloudinary document uploads, and notification preferences.
 */
const { Profile, NotificationPreference, User } = require('../models');
const { uploadAvatar, uploadDocument } = require('./upload.service');
const { AppError } = require('../middleware/error.middleware');

/**
 * Get profile for a user
 * @param {string} userId 
 */
async function getProfile(userId) {
  const profile = await Profile.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }
  const recalculated = profile.calculateCompletion();
  if (profile.profileCompletionPercentage !== recalculated) {
    profile.profileCompletionPercentage = recalculated;
    await profile.save();
  }
  return profile;
}

/**
 * Update user profile
 * @param {string} userId 
 * @param {object} profileData 
 * @param {object} [files] - Uploaded files (avatar, resume)
 */
async function updateProfile(userId, profileData, files = {}) {
  let profile = await Profile.findOne({ where: { userId } });
  if (!profile) {
    profile = await Profile.create({ userId });
  }

  // Handle avatar upload via Cloudinary
  if (files.avatar && files.avatar.buffer) {
    const avatarUrl = await uploadAvatar(files.avatar.buffer, userId);
    profile.avatarUrl = avatarUrl;
  }

  // Handle resume upload via Cloudinary
  if (files.resume && files.resume.buffer) {
    const resumeUrl = await uploadDocument(files.resume.buffer, 'resumes', `resume_${userId}`);
    profile.resumeUrl = resumeUrl;
  }

  const data = { ...profileData };
  // Normalize aliases from various frontend forms
  if (data.name && !data.fullName) data.fullName = data.name;
  if (data.phone && !data.mobileNumber) data.mobileNumber = data.phone;
  if (data.dateOfBirth && !data.dob) data.dob = data.dateOfBirth;
  if (data.highestQualification && !data.educationLevel) data.educationLevel = data.highestQualification;
  if (data.qualificationDetails && !data.degree) data.degree = data.qualificationDetails;
  if (typeof data.gender === 'string') data.gender = data.gender.toUpperCase();
  if (typeof data.category === 'string') data.category = data.category.toUpperCase();

  const allowedFields = [
    'fullName',
    'dob',
    'gender',
    'mobileNumber',
    'state',
    'district',
    'address',
    'category',
    'disabilityStatus',
    'educationLevel',
    'degree',
    'branch',
    'passingYear',
    'avatarUrl',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      profile[field] = data[field];
    }
  }

  profile.profileCompletionPercentage = profile.calculateCompletion();
  await profile.save();

  // If candidate is a Pro member, refresh their matched jobs feed with latest profile data
  try {
    const { getProStatus } = require('./proSubscription.service');
    const proStatus = await getProStatus(userId);
    if (proStatus.isPro) {
      const { matchAllJobsForCandidate } = require('./jobMatching.service');
      matchAllJobsForCandidate(userId).catch(() => {});
    }
  } catch (e) {}

  return profile;
}

/**
 * Get notification preferences
 */
async function getPreferences(userId) {
  let prefs = await NotificationPreference.findOne({ where: { userId } });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }
  return prefs;
}

/**
 * Update notification preferences
 */
async function updatePreferences(userId, prefsData) {
  let prefs = await NotificationPreference.findOne({ where: { userId } });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }

  const allowedFields = [
    'emailEnabled',
    'telegramEnabled',
    'telegramChatId',
    'telegramVerificationCode',
    'newMatchingJobAlerts',
    'deadlineAlerts',
    'inAppAlerts',
    'admitCardAlerts',
    'examAlerts',
    'resultAlerts',
  ];

  for (const field of allowedFields) {
    if (prefsData[field] !== undefined) {
      prefs[field] = prefsData[field];
    }
  }

  await prefs.save();
  return prefs;
}

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
};
