const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asset = sequelize.define('asset', {
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
  purchasedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  purchasedFrom: {
    type: DataTypes.STRING,
    allowNull: true
  },
  invoiceNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  assignedStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  freezeTableName: true,
  timestamps: true
});

module.exports = Asset;
