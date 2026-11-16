const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyAsset = sequelize.define('companyAsset', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  assetName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assetNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assetHandoverNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  noOfItems: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  }
}, {
  freezeTableName: true,
  timestamps: true
});

module.exports = CompanyAsset;
