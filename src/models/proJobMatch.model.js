/**
 * ProJobMatch Model
 * Represents an evaluated match between a Pro candidate and a published recruitment.
 * Includes explicit match reasons ("Why this matches you") and notification status.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const ProJobMatch = sequelize.define(
  'ProJobMatch',
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
    matchScore: {
      type: DataTypes.INTEGER,
      defaultValue: 85,
      allowNull: false,
    },
    matchStatus: {
      type: DataTypes.ENUM('LIKELY_ELIGIBLE', 'MAY_BE_ELIGIBLE'),
      defaultValue: 'LIKELY_ELIGIBLE',
      allowNull: false,
    },
    reasons: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
    notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'pro_job_matches',
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
        fields: ['notified'],
      },
    ],
  }
);

module.exports = ProJobMatch;
