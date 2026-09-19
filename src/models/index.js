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
const Application = require('./application.model');
const AssistanceRequest = require('./assistanceRequest.model');
const Payment = require('./payment.model');
const Membership = require('./membership.model');
const Notification = require('./notification.model');
const NotificationPreference = require('./notificationPreference.model');
const Feedback = require('./feedback.model');
const AuditLog = require('./auditLog.model');
const Otp = require('./otp.model');
const DailyAssistanceLimit = require('./dailyAssistanceLimit.model');
const { ProSubscription } = require('./proSubscription.model');
const ProJobMatch = require('./proJobMatch.model');
const { TrackedJob } = require('./trackedJob.model');
const { NotificationLog } = require('./notificationLog.model');

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

Job.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'creator',
  onDelete: 'SET NULL',
});

AuditLog.belongsTo(User, {
  foreignKey: 'actorId',
  as: 'actor',
  onDelete: 'SET NULL',
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

// ==========================================
// Pro Club V1 Associations
// ==========================================
User.hasOne(ProSubscription, {
  foreignKey: 'userId',
  as: 'proSubscription',
  onDelete: 'CASCADE',
});
ProSubscription.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(ProJobMatch, {
  foreignKey: 'userId',
  as: 'proMatches',
  onDelete: 'CASCADE',
});
ProJobMatch.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Job.hasMany(ProJobMatch, {
  foreignKey: 'jobId',
  as: 'proMatches',
  onDelete: 'CASCADE',
});
ProJobMatch.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

User.hasMany(TrackedJob, {
  foreignKey: 'userId',
  as: 'trackedJobs',
  onDelete: 'CASCADE',
});
TrackedJob.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Job.hasMany(TrackedJob, {
  foreignKey: 'jobId',
  as: 'trackedJobs',
  onDelete: 'CASCADE',
});
TrackedJob.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

User.hasMany(NotificationLog, {
  foreignKey: 'userId',
  as: 'notificationLogs',
  onDelete: 'CASCADE',
});
NotificationLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Job.hasMany(NotificationLog, {
  foreignKey: 'jobId',
  as: 'notificationLogs',
  onDelete: 'CASCADE',
});
NotificationLog.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
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
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_profiles_agentStatus') THEN 
            CREATE TYPE "enum_profiles_agentStatus" AS ENUM ('IDLE', 'ASSISTING'); 
          END IF; 
        END $$;
      `);
      await sequelize.query(`
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "position" "enum_profiles_position" DEFAULT 'CANDIDATE';
      `);
      await sequelize.query(`
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "agentStatus" "enum_profiles_agentStatus" DEFAULT 'IDLE';
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
      await sequelize.query(`
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "createdById" UUID;
      `);
      await sequelize.query(`
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category" VARCHAR(100) DEFAULT 'Central';
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ADD COLUMN IF NOT EXISTS "bookingDate" DATE;
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ADD COLUMN IF NOT EXISTS "isUrgent" BOOLEAN DEFAULT FALSE;
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ADD COLUMN IF NOT EXISTS "urgencyReason" TEXT;
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ADD COLUMN IF NOT EXISTS "customExamTitle" VARCHAR(255);
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ADD COLUMN IF NOT EXISTS "priorityFee" FLOAT DEFAULT 0.0;
      `);
      await sequelize.query(`
        ALTER TABLE "assistance_requests" ALTER COLUMN "jobId" DROP NOT NULL;
      `);
      await sequelize.query(`
        ALTER TABLE "applications" ALTER COLUMN "jobId" DROP NOT NULL;
      `);
      await sequelize.query(`
        ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "newMatchingJobAlerts" BOOLEAN DEFAULT TRUE;
      `);
      await sequelize.query(`
        ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "telegramVerificationCode" VARCHAR(255);
      `);
      await sequelize.query(`
        ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "inAppAlerts" BOOLEAN DEFAULT TRUE;
      `);
    } catch (e) {
      // Fall through to standard sync if tables do not exist yet
    }
  } else if (sequelize.getDialect() === 'sqlite') {
    try {
      const [results] = await sequelize.query("PRAGMA table_info('assistance_requests');");
      if (results && results.length > 0) {
        const colNames = results.map((r) => r.name);
        if (!colNames.includes('bookingDate')) {
          await sequelize.query('ALTER TABLE assistance_requests ADD COLUMN bookingDate TEXT;');
        }
        if (!colNames.includes('isUrgent')) {
          await sequelize.query('ALTER TABLE assistance_requests ADD COLUMN isUrgent INTEGER DEFAULT 0;');
        }
        if (!colNames.includes('urgencyReason')) {
          await sequelize.query('ALTER TABLE assistance_requests ADD COLUMN urgencyReason TEXT;');
        }
        if (!colNames.includes('customExamTitle')) {
          await sequelize.query('ALTER TABLE assistance_requests ADD COLUMN customExamTitle TEXT;');
        }
        if (!colNames.includes('priorityFee')) {
          await sequelize.query('ALTER TABLE assistance_requests ADD COLUMN priorityFee REAL DEFAULT 0.0;');
        }
      }

      const [prefResults] = await sequelize.query("PRAGMA table_info('notification_preferences');");
      if (prefResults && prefResults.length > 0) {
        const prefCols = prefResults.map((r) => r.name);
        if (!prefCols.includes('newMatchingJobAlerts')) {
          await sequelize.query('ALTER TABLE notification_preferences ADD COLUMN newMatchingJobAlerts INTEGER DEFAULT 1;');
        }
        if (!prefCols.includes('telegramVerificationCode')) {
          await sequelize.query('ALTER TABLE notification_preferences ADD COLUMN telegramVerificationCode TEXT;');
        }
        if (!prefCols.includes('inAppAlerts')) {
          await sequelize.query('ALTER TABLE notification_preferences ADD COLUMN inAppAlerts INTEGER DEFAULT 1;');
        }
      }
    } catch (e) {
      // Table doesn't exist yet, standard sync will create it
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
  Application,
  AssistanceRequest,
  Payment,
  Membership,
  Notification,
  NotificationPreference,
  Feedback,
  AuditLog,
  Otp,
  DailyAssistanceLimit,
  ProSubscription,
  ProJobMatch,
  TrackedJob,
  NotificationLog,
};
