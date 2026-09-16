/**
 * Profile Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');

const Profile = sequelize.define(
  'Profile',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.ENUM('CANDIDATE', 'ADMIN', 'AGENT'),
      defaultValue: 'CANDIDATE',
      allowNull: false,
    },
    agentStatus: {
      type: DataTypes.ENUM('IDLE', 'ASSISTING'),
      defaultValue: 'IDLE',
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
      allowNull: true,
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('GENERAL', 'OBC', 'SC', 'ST', 'EWS'),
      defaultValue: 'GENERAL',
      allowNull: true,
    },
    disabilityStatus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    educationLevel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    degree: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passingYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    profileCompletionPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
  },
  {
    tableName: 'profiles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId'],
      },
      {
        fields: ['mobileNumber'],
      },
      {
        fields: ['state'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['position'],
      },
    ],
  }
);

/**
 * Calculates profile completion percentage based on filled fields
 * @returns {number}
 */
Profile.prototype.calculateCompletion = function () {
  const fieldsToCheck = [
    'fullName',
    'dob',
    'gender',
    'mobileNumber',
    'state',
    'district',
    'address',
    'category',
    'educationLevel',
    'degree',
    'branch',
    'passingYear',
    'avatarUrl',
  ];

  let filled = 0;
  for (const field of fieldsToCheck) {
    if (this[field] !== null && this[field] !== undefined && this[field] !== '') {
      filled++;
    }
  }

  return Math.round((filled / fieldsToCheck.length) * 100);
};

module.exports = Profile;
