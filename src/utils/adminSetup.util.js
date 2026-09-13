/**
 * Master Admin Bootstrapper
 * Verifies or provisions the master admin account on server startup.
 * Eliminates the need for manual seeder execution.
 */
const { User, Profile, NotificationPreference } = require('../models');
const { hashPassword } = require('./password.util');
const { ROLES } = require('../constants/role.constant');
const envConfig = require('../config/env.config');
const logger = require('./logger.util');

async function ensureAdminAccount() {
  try {
    const adminEmail = (envConfig.admin.email || 'karmakark1267@gmail.com').trim().toLowerCase();
    const adminPassword = (envConfig.admin.initialPassword || 'Maxevog@2026').trim();

    let admin = await User.findOne({
      where: { email: adminEmail },
      include: [{ model: Profile, as: 'profile' }],
    });

    if (!admin) {
      const passwordHash = await hashPassword(adminPassword);
      admin = await User.create({
        email: adminEmail,
        passwordHash,
        role: ROLES.ADMIN,
        status: 'ACTIVE',
        mustChangePassword: false,
      });

      await Profile.findOrCreate({
        where: { userId: admin.id },
        defaults: {
          userId: admin.id,
          fullName: 'Master Administrator',
          position: 'ADMIN',
          email: adminEmail,
          category: 'GENERAL',
          profileCompletionPercentage: 100,
        },
      });

      await NotificationPreference.findOrCreate({
        where: { userId: admin.id },
        defaults: {
          userId: admin.id,
          emailEnabled: true,
          telegramEnabled: false,
        },
      });

      console.log(`[Admin] Master administrator account created for ${adminEmail}`);
    } else {
      let needsSave = false;
      if (admin.role !== ROLES.ADMIN) {
        admin.role = ROLES.ADMIN;
        needsSave = true;
      }
      if (admin.status !== 'ACTIVE') {
        admin.status = 'ACTIVE';
        needsSave = true;
      }
      if (needsSave) {
        await admin.save();
      }

      // Ensure Profile exists
      await Profile.findOrCreate({
        where: { userId: admin.id },
        defaults: {
          userId: admin.id,
          fullName: 'Master Administrator',
          email: adminEmail,
          category: 'GENERAL',
          profileCompletionPercentage: 100,
        },
      });
    }

    return admin;
  } catch (error) {
    logger.error('Failed to verify or provision master admin account:', {
      error: error.message,
    });
    // Do not crash server, but log warning
  }
}

module.exports = {
  ensureAdminAccount,
};
