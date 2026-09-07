/* eslint-disable no-undef */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('user', {
  name: { type: DataTypes.STRING, allowNull: false },
  empNo: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  roleId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  userImage: { type: DataTypes.STRING },
  url: { type: DataTypes.STRING },
  director: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  paswordReset: { type: DataTypes.BOOLEAN, defaultValue: false },
  isTemporary: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
  separated: { type: DataTypes.BOOLEAN, defaultValue: false },
  separationNote: { type: DataTypes.TEXT },
  separationDate: { type: DataTypes.DATEONLY },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'user', // Points explicitly to the physical "user" table in Postgres
  freezeTableName: true,
  timestamps: true
});

module.exports = User;