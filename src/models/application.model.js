/**
 * Application Model
 * Core tracking model for student government recruitment applications.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { APPLICATION_STATUSES, ALL_APPLICATION_STATUSES } = require('../constants/application.constant');

const Application = sequelize.define(
  'Application',
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
    assistanceRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assignedAgentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    applicationNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...ALL_APPLICATION_STATUSES),
      defaultValue: APPLICATION_STATUSES.INTERESTED,
      allowNull: false,
    },
    submissionAuthorizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    examDate: {
      type: DataTypes.DATEONLY,
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
    statusHistory: {
      type: DataTypes.VIRTUAL,
      get() {
        const meta = this.getDataValue('metadata');
        let parsed = null;
        if (typeof meta === 'object' && meta !== null) {
          parsed = meta;
        } else if (typeof meta === 'string') {
          try {
            parsed = JSON.parse(meta);
          } catch {
            parsed = null;
          }
        }
        return Array.isArray(parsed?.statusHistory) ? parsed.statusHistory : [];
      },
      set(val) {
        const raw = this.getDataValue('metadata');
        let parsed = {};
        if (typeof raw === 'object' && raw !== null) {
          parsed = { ...raw };
        } else if (typeof raw === 'string') {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = {};
          }
        }
        parsed.statusHistory = Array.isArray(val) ? val : [];
        this.setDataValue('metadata', JSON.stringify(parsed));
      },
    },
  },
  {
    tableName: 'applications',
    timestamps: true,
    indexes: [
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
        fields: ['applicationNumber'],
      },
      {
        fields: ['assignedAgentId'],
      },
    ],
  }
);

module.exports = Application;
