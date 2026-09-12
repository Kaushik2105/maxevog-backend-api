/**
 * Job / Recruitment Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { JOB_STATUSES } = require('../constants/application.constant');

const Job = sequelize.define(
  'Job',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recruitmentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shortDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    officialNotificationUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    officialApplicationUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notificationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    applicationStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    applicationLastDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    ageMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 18,
    },
    ageMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 40,
    },
    ageRelaxation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    degreeRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    branchRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vacancies: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    applicationFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    jobLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(JOB_STATUSES.DRAFT, JOB_STATUSES.PUBLISHED, JOB_STATUSES.ARCHIVED),
      defaultValue: JOB_STATUSES.DRAFT,
      allowNull: false,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'jobs',
    timestamps: true,
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['isPublished'],
      },
      {
        fields: ['applicationLastDate'],
      },
      {
        fields: ['organization'],
      },
      {
        fields: ['state'],
      },
      {
        fields: ['isFeatured'],
      },
    ],
  }
);

module.exports = Job;
