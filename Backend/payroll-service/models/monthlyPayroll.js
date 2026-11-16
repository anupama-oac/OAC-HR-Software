const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MonthlyPayroll = sequelize.define('monthlyPayroll', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  basic: { type: DataTypes.DECIMAL(10, 2) },
  hra: { type: DataTypes.DECIMAL(10, 2) },
  conveyanceAllowance: { type: DataTypes.DECIMAL(10, 2) },
  lta: { type: DataTypes.DECIMAL(10, 2) },
  specialAllowance: { type: DataTypes.DECIMAL(10, 2) },

  ot: { type: DataTypes.DECIMAL(10, 2) },
  incentive: { type: DataTypes.DECIMAL(10, 2) },
  payOut: { type: DataTypes.DECIMAL(10, 2) },

  pfDeduction: { type: DataTypes.DECIMAL(10, 2) },
  esi: { type: DataTypes.DECIMAL(10, 2) },
  tds: { type: DataTypes.DECIMAL(10, 2) },
  advanceAmount: { type: DataTypes.DECIMAL(10, 2) },
  leaveDays: { type: DataTypes.DECIMAL(10, 2) },
  leaveDeduction: { type: DataTypes.DECIMAL(10, 2) },
  incentiveDeduction: { type: DataTypes.DECIMAL(10, 2) },

  leaveEncashment: { type: DataTypes.DECIMAL(10, 2) },
  leaveEncashmentAmount: { type: DataTypes.DECIMAL(10, 2) },
  
  toPay: { type: DataTypes.FLOAT },
  payedFor: { type: DataTypes.STRING },
  payedAt: { type: DataTypes.DATEONLY },
  daysInMonth: { type: DataTypes.INTEGER },
  status: { type: DataTypes.STRING, defaultValue: 'Added' },
  isSent: { type: DataTypes.BOOLEAN }
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = MonthlyPayroll;
