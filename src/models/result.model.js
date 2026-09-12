/**
 * Result Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const Result = sequelize.define(
  'Result',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resultType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resultDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    officialResultUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cutoffInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nextStageInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attachmentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'results',
    timestamps: true,
    indexes: [
      {
        fields: ['jobId'],
      },
      {
        fields: ['isPublished'],
      },
      {
        fields: ['resultDate'],
      },
    ],
  }
);

module.exports = Result;
