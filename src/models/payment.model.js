/**
 * Payment Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const {
  PAYMENT_STATUSES,
  ALL_PAYMENT_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_TYPES,
} = require('../constants/payment.constant');

const Payment = sequelize.define(
  'Payment',
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
    applicationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assistanceRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    membershipId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    paymentType: {
      type: DataTypes.ENUM(PAYMENT_TYPES.ASSISTANCE, PAYMENT_TYPES.MEMBERSHIP),
      allowNull: false,
    },
    officialFee: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    serviceFee: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'INR',
    },
    provider: {
      type: DataTypes.ENUM(
        PAYMENT_PROVIDERS.MOCK,
        PAYMENT_PROVIDERS.RAZORPAY,
        PAYMENT_PROVIDERS.STRIPE,
        PAYMENT_PROVIDERS.CASHFREE
      ),
      defaultValue: PAYMENT_PROVIDERS.MOCK,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...ALL_PAYMENT_STATUSES),
      defaultValue: PAYMENT_STATUSES.PENDING,
      allowNull: false,
    },
    paidAt: {
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
    tableName: 'payments',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['transactionId'],
      },
      {
        fields: ['paymentType'],
      },
    ],
  }
);

module.exports = Payment;
