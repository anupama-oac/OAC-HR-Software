const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payroll = sequelize.define('payroll', {
  userId: { type: DataTypes.INTEGER, allowNull: false },

  basic: { type: DataTypes.DECIMAL(10, 2) },
  hra: { type: DataTypes.DECIMAL(10, 2) },
  conveyanceAllowance: { type: DataTypes.DECIMAL(10, 2) },
  lta: { type: DataTypes.DECIMAL(10, 2) },
  specialAllowance: { type: DataTypes.DECIMAL(10, 2) },
  grossPay: { type: DataTypes.DECIMAL(10, 2) },

  pf: { type: DataTypes.DECIMAL(10, 2) },
  insurance: { type: DataTypes.DECIMAL(10, 2) },
  gratuity: { type: DataTypes.DECIMAL(10, 2) },
  netPay: { type: DataTypes.DECIMAL(10, 2) },
  pfDeduction: { type: DataTypes.DECIMAL(10, 2) },
  esi: { type: DataTypes.DECIMAL(10, 2) },
  incentiveDeduction: { type: DataTypes.DECIMAL(10, 2) }
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = Payroll;
