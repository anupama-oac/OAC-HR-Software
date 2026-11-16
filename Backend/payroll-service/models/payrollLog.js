const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollLog = sequelize.define('payrollLog', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  oldIncome: { type: DataTypes.FLOAT },
  newIncome: { type: DataTypes.FLOAT },
  updatedDate: { type: DataTypes.DATE }
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = PayrollLog;
