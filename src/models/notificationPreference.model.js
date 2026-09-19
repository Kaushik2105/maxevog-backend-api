/**
 * Notification Preference Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const NotificationPreference = sequelize.define(
  'NotificationPreference',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    telegramEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    telegramChatId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telegramVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    newMatchingJobAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    deadlineAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    inAppAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    admitCardAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    examAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    resultAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'notification_preferences',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId'],
      },
    ],
  }
);

module.exports = NotificationPreference;
