/**
 * Feedback Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const {
  FEEDBACK_TYPES,
  ALL_FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  ALL_FEEDBACK_STATUSES,
} = require('../constants/feedback.constant');

const Feedback = sequelize.define(
  'Feedback',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...ALL_FEEDBACK_TYPES),
      defaultValue: FEEDBACK_TYPES.FEEDBACK,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    status: {
      type: DataTypes.ENUM(...ALL_FEEDBACK_STATUSES),
      defaultValue: FEEDBACK_STATUSES.OPEN,
      allowNull: false,
    },
    adminResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'feedbacks',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

module.exports = Feedback;
