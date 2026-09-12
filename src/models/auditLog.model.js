/**
 * Audit Log Model
 * Tracks all administrative, application state, and financial state transitions.
 * NEVER stores passwords, OTPs, PINs, or card CVVs.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
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
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable append-only
    indexes: [
      {
        fields: ['actorId'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['entityType', 'entityId'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

module.exports = AuditLog;
