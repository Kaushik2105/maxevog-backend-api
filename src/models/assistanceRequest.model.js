/**
 * Assistance Request Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { ASSISTANCE_STATUSES, ALL_ASSISTANCE_STATUSES } = require('../constants/assistance.constant');

const AssistanceRequest = sequelize.define(
  'AssistanceRequest',
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
    applicationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    preferredSlotId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assignedAgentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...ALL_ASSISTANCE_STATUSES),
      defaultValue: ASSISTANCE_STATUSES.REQUESTED,
      allowNull: false,
    },
    serviceFee: {
      type: DataTypes.FLOAT,
      defaultValue: 50.0,
      allowNull: false,
    },
    officialFee: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    meetingLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verificationRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'assistance_requests',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['jobId'],
      },
      {
        fields: ['assignedAgentId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['scheduledAt'],
      },
    ],
  }
);

module.exports = AssistanceRequest;
