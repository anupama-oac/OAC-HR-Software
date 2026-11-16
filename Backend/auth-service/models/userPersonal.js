/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const UserPersonal = sequelize.define('userPersonal', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  dateOfJoining: { type: DataTypes.DATEONLY, allowNull: true },
  confirmationDate: { type: DataTypes.DATEONLY, allowNull: true },
  bloodGroup: { type: DataTypes.STRING, allowNull: true },
  emergencyContactNo: { type: DataTypes.STRING, allowNull: true },
  emergencyContactName: { type: DataTypes.STRING, allowNull: true },
  emergencyContactRelation: { type: DataTypes.STRING, allowNull: true },
  maritalStatus: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  parentName: { type: DataTypes.STRING, allowNull: true },
  spouseName: { type: DataTypes.STRING, allowNull: true },
  referredBy: { type: DataTypes.STRING, allowNull: true },
  reportingMangerId: { type: DataTypes.INTEGER, allowNull: true },
  spouseContactNo: { type: DataTypes.STRING, allowNull: true },
  parentContactNo: { type: DataTypes.STRING, allowNull: true },
  motherName: { type: DataTypes.STRING, allowNull: true },
  motherContactNo: { type: DataTypes.STRING, allowNull: true },
  temporaryAddress: { type: DataTypes.TEXT, allowNull: true },
  permanentAddress: { type: DataTypes.TEXT, allowNull: true },
  qualification: { type: DataTypes.STRING, allowNull: true },
  experience: { type: DataTypes.STRING, allowNull: true }
},
{
  freezeTableName: true,
  timestamps: true
});

module.exports = UserPersonal;
