/**
 * Admit Card Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const AdmitCard = sequelize.define(
  'AdmitCard',
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
    availabilityDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    officialAdmitCardUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'AVAILABLE',
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
    tableName: 'admit_cards',
    timestamps: true,
    indexes: [
      {
        fields: ['jobId'],
      },
      {
        fields: ['isPublished'],
      },
      {
        fields: ['availabilityDate'],
      },
      {
        fields: ['examDate'],
      },
    ],
  }
);

module.exports = AdmitCard;
