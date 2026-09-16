/**
 * Daily Assistance Limit Model
 * Tracks daily capacity limits for 1-on-1 application assistance.
 * Eliminates fixed time slots in favor of daily capacity governance.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const DailyAssistanceLimit = sequelize.define(
  'DailyAssistanceLimit',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    dailyLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    bookedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: 'daily_assistance_limits',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['date'],
      },
    ],
  }
);

module.exports = DailyAssistanceLimit;
