/**
 * One-Time Password (OTP) Model
 * Stores ephemeral verification codes for email registration & verification.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const Otp = sequelize.define(
  'Otp',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'otps',
    timestamps: true,
    indexes: [
      {
        fields: ['email'],
      },
      {
        fields: ['expiresAt'],
      },
    ],
  }
);

module.exports = Otp;
