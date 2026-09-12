/**
 * Time Slot Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { TIME_SLOT_STATUSES } = require('../constants/assistance.constant');

const TimeSlot = sequelize.define(
  'TimeSlot',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    maxCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    availableCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM(
        TIME_SLOT_STATUSES.AVAILABLE,
        TIME_SLOT_STATUSES.BOOKED,
        TIME_SLOT_STATUSES.CANCELLED
      ),
      defaultValue: TIME_SLOT_STATUSES.AVAILABLE,
      allowNull: false,
    },
  },
  {
    tableName: 'time_slots',
    timestamps: true,
    indexes: [
      {
        fields: ['date'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

module.exports = TimeSlot;
