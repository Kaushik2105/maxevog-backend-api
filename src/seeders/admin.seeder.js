/**
 * Admin Seeder
 * Initializes or resets the master admin account with strong randomized credentials.
 * NEVER hardcodes credentials in source code.
 */
const { connectDatabase } = require('../config/database.config');
const { syncDatabase, User, Profile, NotificationPreference } = require('../models');
const { hashPassword, generateRandomPassword } = require('../utils/password.util');
const { ROLES } = require('../constants/role.constant');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

async function seedAdmin() {
  try {
    await connectDatabase();
    await syncDatabase();

    const adminEmail = (envConfig.admin.email || 'karmakark1267@gmail.com').trim().toLowerCase();
    const initialPassword = envConfig.admin.initialPassword || generateRandomPassword(16);
    const passwordHash = await hashPassword(initialPassword);

    let [admin, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        email: adminEmail,
        passwordHash,
        role: ROLES.ADMIN,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
    });

    if (!created) {
      admin.passwordHash = passwordHash;
      admin.role = ROLES.ADMIN;
      admin.status = 'ACTIVE';
      await admin.save();
    }

    // Ensure Admin Profile exists
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

    // Ensure Notification Preferences exist
    await NotificationPreference.findOrCreate({
      where: { userId: admin.id },
      defaults: {
        userId: admin.id,
        emailEnabled: true,
        telegramEnabled: false,
      },
    });

    console.log('\n========================================================');
    console.log('  ADMIN ACCOUNT SEEDING SUCCESSFUL');
    console.log('========================================================');
    console.log(`  Admin Email    : ${adminEmail}`);
    console.log(`  Initial Password: ${initialPassword}`);
    console.log(`  Role           : ${ROLES.ADMIN}`);
    console.log('  NOTE: Please save this password securely.');
    console.log('========================================================\n');

    return { adminEmail, initialPassword };
  } catch (error) {
    logger.error('Admin seeding failed:', { error: error.message });
    throw error;
  }
}

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedAdmin;
