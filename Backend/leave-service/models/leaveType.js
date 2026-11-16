const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaveType = sequelize.define('leaveType', {
  leaveTypeName: { type: DataTypes.STRING, allowNull: true },
}, {
  freezeTableName: true,
  timestamps: true,
});

const leaveTypeData = [
  { leaveTypeName: 'Casual Leave' },
  { leaveTypeName: 'Sick Leave' },
  { leaveTypeName: 'LOP' },
  { leaveTypeName: 'Comp Off' },
  { leaveTypeName: 'Maternity Leave' },
];

const initializeLeaveTypes = async () => {
  try {
    for (const item of leaveTypeData) {
      await LeaveType.findOrCreate({
        where: { leaveTypeName: item.leaveTypeName },
        defaults: item
      });
    }
  } catch (err) {
    console.error('Error initializing default leave types:', err);
  }
};

initializeLeaveTypes();

module.exports = LeaveType;
