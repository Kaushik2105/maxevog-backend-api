/**
 * ProSubscription Model
 * Manages maxEvoG Pro Club candidate subscriptions (V1: 3-month quarterly validity, 1 free assistance credit).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const PRO_SUBSCRIPTION_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
});

const ALL_PRO_SUBSCRIPTION_STATUSES = Object.freeze(Object.values(PRO_SUBSCRIPTION_STATUSES));

const ProSubscription = sequelize.define(
  'ProSubscription',
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
      defaultValue: 'PRO_QUARTERLY_249',
      allowNull: false,
    },
    planName: {
      type: DataTypes.STRING,
      defaultValue: 'maxEvoG Pro Club (Quarterly - 3 Months)',
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      defaultValue: 249.0,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ALL_PRO_SUBSCRIPTION_STATUSES),
      defaultValue: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
      allowNull: false,
    },
    assistanceCreditsTotal: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    assistanceCreditsUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'pro_subscriptions',
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
 * Check if the subscription is actively valid
 */
ProSubscription.prototype.isActive = function () {
  if (this.status !== PRO_SUBSCRIPTION_STATUSES.ACTIVE) return false;
  if (!this.endDate) return false;
  return new Date(this.endDate).getTime() >= Date.now();
};

/**
 * Helper to check if assistance credit is available
 */
ProSubscription.prototype.hasFreeAssistanceAvailable = function () {
  return this.isActive() && this.assistanceCreditsUsed < this.assistanceCreditsTotal;
};

module.exports = {
  ProSubscription,
  PRO_SUBSCRIPTION_STATUSES,
  ALL_PRO_SUBSCRIPTION_STATUSES,
};
