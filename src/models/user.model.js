/**
 * User Model
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database.config');
const { ROLES } = require('../constants/role.constant');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(ROLES.USER, ROLES.ADMIN, ROLES.AGENT),
      defaultValue: ROLES.USER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'SUSPENDED'),
      defaultValue: 'ACTIVE',
      allowNull: false,
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

// Method to safely return user object without password hash
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};

module.exports = User;
