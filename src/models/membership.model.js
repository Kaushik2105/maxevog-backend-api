/**
 * Membership Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { MEMBERSHIP_STATUSES, ALL_MEMBERSHIP_STATUSES } = require('../constants/membership.constant');

const Membership = sequelize.define(
  'Membership',
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
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    planId: {
      type: DataTypes.STRING,
      defaultValue: 'QUARTERLY_249',
      allowNull: false,
    },
    planName: {
      type: DataTypes.STRING,
      defaultValue: 'Quarterly Plan (3 Months)',
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      defaultValue: 249.0,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...ALL_MEMBERSHIP_STATUSES),
      defaultValue: MEMBERSHIP_STATUSES.PENDING,
      allowNull: false,
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'memberships',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['endDate'],
      },
    ],
  }
);

/**
 * Helper to check whether membership is currently active
 */
Membership.prototype.isActive = function () {
  if (this.status !== MEMBERSHIP_STATUSES.ACTIVE) return false;
  if (!this.endDate) return false;
  return new Date(this.endDate).getTime() >= Date.now();
};

module.exports = Membership;
