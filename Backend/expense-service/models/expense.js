const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('expense', {
  expenseNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'PENDING'
  },
  expenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paymentMode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  url: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = Expense;
