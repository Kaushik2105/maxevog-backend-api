/**
 * Authentication Service
 * Business logic for user registration, authentication, and session handling.
 */
const { User, Profile, NotificationPreference, Otp, sequelize } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { generateToken } = require('../utils/jwt.util');
const { ROLES } = require('../constants/role.constant');
const { AppError } = require('../middleware/error.middleware');
const { sendOtpEmail } = require('./emailjs.service');
const { Op } = require('sequelize');
const crypto = require('crypto');
const envConfig = require('../config/env.config');

/**
 * Send an OTP to an applicant email before registration
 */
async function sendRegistrationOtp({ email, fullName = '' }) {
  const normalizedEmail = email.trim().toLowerCase();
  const candidateName = (fullName || '').trim();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('An account with this email address already exists. Please sign in.', 409);
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await Otp.create({
    email: normalizedEmail,
    otp,
    expiresAt,
    isUsed: false,
  });

  const emailResult = await sendOtpEmail({
    toEmail: normalizedEmail,
    toName: candidateName,
    otp,
  });

  return {
    email: normalizedEmail,
    message: 'Verification code sent to your email address.',
    simulated: emailResult.simulated || false,
    devOtp: !envConfig.app.isProduction ? otp : undefined,
  };
}

/**
 * Verify OTP and complete manual candidate registration (Name, Email, Password only)
 */
async function verifyOtpAndRegister({ email, password, fullName = '', otp }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!otp) {
    throw new AppError('Verification code is required', 400);
  }

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('An account with this email address already exists. Please sign in.', 409);
  }

  const otpRecord = await Otp.findOne({
    where: {
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!otpRecord) {
    throw new AppError('Verification code expired or not found. Please request a new code.', 400);
  }

  if (otpRecord.otp !== otp.trim()) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 5) {
      otpRecord.isUsed = true;
    }
    await otpRecord.save();
    throw new AppError('Invalid verification code. Please check and try again.', 400);
  }

  // Mark OTP used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Create user
  return registerUser({ email: normalizedEmail, password, fullName });
}

/**
 * Authenticate or register candidate via Google OAuth 2.0
 */
async function googleAuth({ credential, email, fullName, avatarUrl, googleId }) {
  let verifiedEmail = email;
  let verifiedName = fullName;
  let verifiedAvatar = avatarUrl;

  if (credential) {
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.email) {
          verifiedEmail = payload.email;
          verifiedName = payload.name || verifiedName;
          verifiedAvatar = payload.picture || verifiedAvatar;
        }
      }
    } catch (e) {
      // Fall back to parameters
    }
  }

  if (!verifiedEmail) {
    throw new AppError('Unable to extract verified email from Google identity', 400);
  }

  const normalizedEmail = verifiedEmail.trim().toLowerCase();

  let user = await User.findOne({
    where: { email: normalizedEmail },
    include: [
      { model: Profile, as: 'profile' },
      { model: NotificationPreference, as: 'notificationPreference' },
    ],
  });

  if (!user) {
    const randomPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

    const result = await sequelize.transaction(async (t) => {
      const newUser = await User.create(
        {
          email: normalizedEmail,
          passwordHash: randomPassword,
          role: ROLES.USER,
          status: 'ACTIVE',
        },
        { transaction: t }
      );

      const profile = await Profile.create(
        {
          userId: newUser.id,
          email: normalizedEmail,
          fullName: verifiedName || 'Google User',
          avatarUrl: verifiedAvatar || null,
          category: 'GENERAL',
        },
        { transaction: t }
      );

      profile.profileCompletionPercentage = profile.calculateCompletion();
      await profile.save({ transaction: t });

      await NotificationPreference.create(
        {
          userId: newUser.id,
          emailEnabled: true,
          telegramEnabled: false,
        },
        { transaction: t }
      );

      return { newUser, profile };
    });

    user = await User.findByPk(result.newUser.id, {
      include: [
        { model: Profile, as: 'profile' },
        { model: NotificationPreference, as: 'notificationPreference' },
      ],
    });
  } else {
    // If user already exists, update avatar or fullName if not set
    if (user.profile) {
      let changed = false;
      if (!user.profile.avatarUrl && verifiedAvatar) {
        user.profile.avatarUrl = verifiedAvatar;
        changed = true;
      }
      if ((!user.profile.fullName || user.profile.fullName === 'Candidate') && verifiedName) {
        user.profile.fullName = verifiedName;
        changed = true;
      }
      if (changed) {
        user.profile.profileCompletionPercentage = user.profile.calculateCompletion();
        await user.profile.save();
      }
    }
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Your account has been suspended. Please contact platform support.', 403);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Register a new applicant user
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.fullName]
 * @param {string} [params.mobileNumber]
 */
async function registerUser({ email, password, fullName = '', mobileNumber = '' }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('An account with this email address already exists', 409);
  }

  const hashedPassword = await hashPassword(password);

  // Execute in transaction to guarantee complete user initialization
  const result = await sequelize.transaction(async (t) => {
    const user = await User.create(
      {
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: ROLES.USER,
        status: 'ACTIVE',
      },
      { transaction: t }
    );

    const profile = await Profile.create(
      {
        userId: user.id,
        email: normalizedEmail,
        fullName,
        mobileNumber: mobileNumber || null,
        category: 'GENERAL',
      },
      { transaction: t }
    );

    // Initial completion percentage
    profile.profileCompletionPercentage = profile.calculateCompletion();
    await profile.save({ transaction: t });

    await NotificationPreference.create(
      {
        userId: user.id,
        emailEnabled: true,
        telegramEnabled: false,
      },
      { transaction: t }
    );

    return { user, profile };
  });

  const token = generateToken({
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
  });

  return {
    user: result.user.toJSON(),
    profile: result.profile,
    token,
  };
}

/**
 * Authenticate user with credentials
 * @param {string} email 
 * @param {string} password 
 */
async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    where: { email: normalizedEmail },
    include: [
      { model: Profile, as: 'profile' },
      { model: NotificationPreference, as: 'notificationPreference' },
    ],
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Your account has been suspended. Please contact platform support.', 403);
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Get current user profile details
 * @param {string} userId 
 */
async function getCurrentUser(userId) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Profile, as: 'profile' },
      { model: NotificationPreference, as: 'notificationPreference' },
    ],
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Ensure completion percentage reflects current state
  if (user.profile) {
    const recalculated = user.profile.calculateCompletion();
    if (user.profile.profileCompletionPercentage !== recalculated) {
      user.profile.profileCompletionPercentage = recalculated;
      await user.profile.save();
    }
  }

  return user.toJSON();
}

/**
 * Change password
 */
async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValid = await comparePassword(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Incorrect current password', 400);
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  return true;
}

module.exports = {
  registerUser,
  sendRegistrationOtp,
  verifyOtpAndRegister,
  googleAuth,
  loginUser,
  getCurrentUser,
  changePassword,
};
