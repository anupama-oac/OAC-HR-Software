const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PettyCash = sequelize.define('pettyCash', {
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  transactionType: {
    type: DataTypes.ENUM('CREDIT', 'DEBIT'),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  expenseId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = PettyCash;
