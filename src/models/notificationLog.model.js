/**
 * NotificationLog Model
 * Audits all Pro notification delivery attempts across Email, Telegram, and In-App channels.
 * Guarantees strict idempotency so duplicate reminders/alerts are never dispatched.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const PRO_NOTIFICATION_TYPES = Object.freeze({
  NEW_MATCHING_JOB: 'NEW_MATCHING_JOB',
  TRACKED_DEADLINE_D7: 'TRACKED_DEADLINE_D7',
  TRACKED_DEADLINE_D3: 'TRACKED_DEADLINE_D3',
  TRACKED_DEADLINE_D1: 'TRACKED_DEADLINE_D1',
  TRACKED_DEADLINE_D0: 'TRACKED_DEADLINE_D0',
  DEADLINE_UPDATED: 'DEADLINE_UPDATED',
  PRO_SUBSCRIPTION: 'PRO_SUBSCRIPTION',
});

const ALL_PRO_NOTIFICATION_TYPES = Object.freeze(Object.values(PRO_NOTIFICATION_TYPES));

const NotificationLog = sequelize.define(
  'NotificationLog',
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
      allowNull: true,
    },
    notificationType: {
      type: DataTypes.ENUM(...ALL_PRO_NOTIFICATION_TYPES),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM('EMAIL', 'TELEGRAM', 'IN_APP'),
      allowNull: false,
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('SENT', 'FAILED', 'SKIPPED'),
      defaultValue: 'SENT',
      allowNull: false,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('metadata');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('metadata', typeof val === 'object' ? JSON.stringify(val) : val);
      },
    },
  },
  {
    tableName: 'notification_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['jobId'],
      },
      {
        fields: ['notificationType'],
      },
      {
        fields: ['channel'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['userId', 'jobId', 'notificationType', 'channel'],
      },
    ],
  }
);

module.exports = {
  NotificationLog,
  PRO_NOTIFICATION_TYPES,
  ALL_PRO_NOTIFICATION_TYPES,
};
