/**
 * Authentication Service
 * Business logic for user registration, authentication, and session handling.
 */
const { User, Profile, NotificationPreference, sequelize } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { generateToken } = require('../utils/jwt.util');
const { ROLES } = require('../constants/role.constant');
const { AppError } = require('../middleware/error.middleware');

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
        mobileNumber,
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
  loginUser,
  getCurrentUser,
  changePassword,
};
