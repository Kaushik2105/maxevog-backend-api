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

      // Ensure Profile exists and has ADMIN position
      const [adminProfile] = await Profile.findOrCreate({
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

      if (adminProfile && adminProfile.position !== 'ADMIN') {
        adminProfile.position = 'ADMIN';
        await adminProfile.save();
      }
    }

    // Align existing user profile positions according to their roles
    try {
      const adminUsers = await User.findAll({ where: { role: ROLES.ADMIN } });
      for (const u of adminUsers) {
        await Profile.update({ position: 'ADMIN' }, { where: { userId: u.id, position: 'CANDIDATE' } });
      }

      const agentUsers = await User.findAll({ where: { role: ROLES.AGENT } });
      for (const a of agentUsers) {
        await Profile.update({ position: 'AGENT' }, { where: { userId: a.id, position: 'CANDIDATE' } });
      }

      const candidateUsers = await User.findAll({ where: { role: ROLES.USER } });
      for (const c of candidateUsers) {
        await Profile.update({ position: 'CANDIDATE' }, { where: { userId: c.id, position: ['ADMIN', 'AGENT'] } });
      }

      // Ensure any existing results and admit cards are published
      const { Result, AdmitCard } = require('../models');
      await Result.update({ isPublished: true }, { where: { isPublished: false } });
      await AdmitCard.update({ isPublished: true }, { where: { isPublished: false } });
    } catch (alignErr) {
      logger.warn('Role-position synchronization skipped:', { message: alignErr.message });
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
