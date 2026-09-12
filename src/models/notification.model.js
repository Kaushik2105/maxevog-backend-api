/**
 * Notification Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const {
  NOTIFICATION_TYPES,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  ALL_NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  ALL_NOTIFICATION_STATUSES,
} = require('../constants/notification.constant');

const Notification = sequelize.define(
  'Notification',
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
    type: {
      type: DataTypes.ENUM(...ALL_NOTIFICATION_TYPES),
      defaultValue: NOTIFICATION_TYPES.SYSTEM,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM(...ALL_NOTIFICATION_CHANNELS),
      defaultValue: NOTIFICATION_CHANNELS.EMAIL,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ALL_NOTIFICATION_STATUSES),
      defaultValue: NOTIFICATION_STATUSES.PENDING,
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['type'],
      },
    ],
  }
);

module.exports = Notification;
