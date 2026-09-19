/**
 * TrackedJob / Personal Application Tracker Model
 * Tracks candidate applications:
 * Tracked / Not Applied -> Application In Progress -> Application Submitted (+ Expired)
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const TRACKED_JOB_STATUSES = Object.freeze({
  TRACKED: 'TRACKED',           // Tracked / Not Applied
  IN_PROGRESS: 'IN_PROGRESS',   // Application In Progress
  APPLIED: 'APPLIED',           // Application Submitted
  EXPIRED: 'EXPIRED',           // Expired / Missed
});

const ALL_TRACKED_JOB_STATUSES = Object.freeze(Object.values(TRACKED_JOB_STATUSES));

const TrackedJob = sequelize.define(
  'TrackedJob',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ALL_TRACKED_JOB_STATUSES),
      defaultValue: TRACKED_JOB_STATUSES.TRACKED,
      allowNull: false,
    },
    deadlineAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    remindersCancelled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'tracked_jobs',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'jobId'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['jobId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['deadlineAt'],
      },
      {
        fields: ['remindersCancelled'],
      },
    ],
  }
);

/**
 * Calculates remaining days until deadline
 */
TrackedJob.prototype.getDaysRemaining = function () {
  if (!this.deadlineAt) return null;
  const deadline = new Date(this.deadlineAt);
  const today = new Date(new Date().toISOString().split('T')[0]);
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = {
  TrackedJob,
  TRACKED_JOB_STATUSES,
  ALL_TRACKED_JOB_STATUSES,
};
