/**
 * Models Association & Database Registry
 * Establishes all Sequelize relationships and associations.
 */
const { sequelize } = require('../config/database.config');

const User = require('./user.model');
const Profile = require('./profile.model');
const Job = require('./job.model');
const Result = require('./result.model');
const AdmitCard = require('./admitCard.model');
const TimeSlot = require('./timeSlot.model');
const Application = require('./application.model');
const AssistanceRequest = require('./assistanceRequest.model');
const Payment = require('./payment.model');
const Membership = require('./membership.model');
const Notification = require('./notification.model');
const NotificationPreference = require('./notificationPreference.model');
const Feedback = require('./feedback.model');
const AuditLog = require('./auditLog.model');
const Otp = require('./otp.model');

// ==========================================
// User & Profile
// ==========================================
User.hasOne(Profile, {
  foreignKey: 'userId',
  as: 'profile',
  onDelete: 'CASCADE',
});
Profile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ==========================================
// User & Notification Preferences
// ==========================================
User.hasOne(NotificationPreference, {
  foreignKey: 'userId',
  as: 'notificationPreference',
  onDelete: 'CASCADE',
});
NotificationPreference.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ==========================================
// Job & Recruitment Details
// ==========================================
Job.hasMany(Result, {
  foreignKey: 'jobId',
  as: 'results',
  onDelete: 'SET NULL',
});
Result.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

Job.hasMany(AdmitCard, {
  foreignKey: 'jobId',
  as: 'admitCards',
  onDelete: 'SET NULL',
});
AdmitCard.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

// ==========================================
// User, Job & Application
// ==========================================
User.hasMany(Application, {
  foreignKey: 'userId',
  as: 'applications',
  onDelete: 'CASCADE',
});
Application.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Job.hasMany(Application, {
  foreignKey: 'jobId',
  as: 'applications',
  onDelete: 'RESTRICT',
});
Application.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

Application.belongsTo(User, {
  foreignKey: 'assignedAgentId',
  as: 'assignedAgent',
});

// ==========================================
// Assistance Request Associations
// ==========================================
User.hasMany(AssistanceRequest, {
  foreignKey: 'userId',
  as: 'assistanceRequests',
  onDelete: 'CASCADE',
});
AssistanceRequest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

AssistanceRequest.belongsTo(User, {
  foreignKey: 'assignedAgentId',
  as: 'assignedAgent',
});

Job.hasMany(AssistanceRequest, {
  foreignKey: 'jobId',
  as: 'assistanceRequests',
  onDelete: 'RESTRICT',
});
AssistanceRequest.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

TimeSlot.hasMany(AssistanceRequest, {
  foreignKey: 'preferredSlotId',
  as: 'assistanceRequests',
  onDelete: 'SET NULL',
});
AssistanceRequest.belongsTo(TimeSlot, {
  foreignKey: 'preferredSlotId',
  as: 'preferredSlot',
});
AssistanceRequest.belongsTo(TimeSlot, {
  foreignKey: 'preferredSlotId',
  as: 'timeSlot',
});

AssistanceRequest.hasOne(Application, {
  foreignKey: 'assistanceRequestId',
  as: 'application',
});
Application.belongsTo(AssistanceRequest, {
  foreignKey: 'assistanceRequestId',
  as: 'assistanceRequest',
});

// ==========================================
// Payment Associations
// ==========================================
User.hasMany(Payment, {
  foreignKey: 'userId',
  as: 'payments',
  onDelete: 'CASCADE',
});
Payment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Application.hasOne(Payment, {
  foreignKey: 'applicationId',
  as: 'payment',
});
Payment.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application',
});

AssistanceRequest.hasOne(Payment, {
  foreignKey: 'assistanceRequestId',
  as: 'payment',
});
Payment.belongsTo(AssistanceRequest, {
  foreignKey: 'assistanceRequestId',
  as: 'assistanceRequest',
});

Membership.hasOne(Payment, {
  foreignKey: 'membershipId',
  as: 'payment',
});
Payment.belongsTo(Membership, {
  foreignKey: 'membershipId',
  as: 'membership',
});

// ==========================================
// Membership Associations
// ==========================================
User.hasMany(Membership, {
  foreignKey: 'userId',
  as: 'memberships',
  onDelete: 'CASCADE',
});
Membership.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ==========================================
// Notifications & Feedbacks
// ==========================================
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Feedback, {
  foreignKey: 'userId',
  as: 'feedbacks',
  onDelete: 'SET NULL',
});
Feedback.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

/**
 * Sync all models with database
 * @param {object} options
 */
async function syncDatabase(options = {}) {
  if (sequelize.getDialect() === 'postgres') {
    try {
      await sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_profiles_position') THEN 
            CREATE TYPE "enum_profiles_position" AS ENUM ('CANDIDATE', 'ADMIN', 'AGENT'); 
          END IF; 
        END $$;
      `);
      await sequelize.query(`
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "position" "enum_profiles_position" DEFAULT 'CANDIDATE';
      `);
      await sequelize.query(`
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "tables" JSONB DEFAULT '[]'::jsonb;
      `);
      await sequelize.query(`
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "eligibleDegrees" JSONB DEFAULT '[]'::jsonb;
      `);
      await sequelize.query(`
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "eligibleBranches" JSONB DEFAULT '[]'::jsonb;
      `);
    } catch (e) {
      // Fall through to standard sync if tables do not exist yet
    }
  }
  await sequelize.sync(options);
  console.log('[DB] Database schema synchronized successfully.');
}

module.exports = {
  sequelize,
  syncDatabase,
  User,
  Profile,
  Job,
  Result,
  AdmitCard,
  TimeSlot,
  Application,
  AssistanceRequest,
  Payment,
  Membership,
  Notification,
  NotificationPreference,
  Feedback,
  AuditLog,
  Otp,
};
