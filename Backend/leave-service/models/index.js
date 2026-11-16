const { sequelize } = require('../config/database');

const Leave = require('./leave');
const LeaveType = require('./leaveType');
const CompOff = require('./compOff');
const Holiday = require('./holiday');
const UserEmail = require('./userEmail');
const UserLeave = require('./userLeave');

// Define All Associations
if (!LeaveType.associations || !LeaveType.associations.leaves) {
  LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId', as: 'leaves', onUpdate: 'CASCADE' });
}
if (!Leave.associations || !Leave.associations.leaveType) {
  Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
}

if (!LeaveType.associations || !LeaveType.associations.userLeaves) {
  LeaveType.hasMany(UserLeave, { foreignKey: 'leaveTypeId', as: 'userLeaves', onUpdate: 'CASCADE' });
}
if (!UserLeave.associations || !UserLeave.associations.leaveType) {
  UserLeave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
}

// Default Seed Logic
const seedLeaveTypes = async () => {
  const defaultTypes = [
    { leaveTypeName: 'Casual Leave' },
    { leaveTypeName: 'Sick Leave' },
    { leaveTypeName: 'LOP' },
    { leaveTypeName: 'Comp Off' },
    { leaveTypeName: 'Maternity Leave' },
  ];
  for (const item of defaultTypes) {
    await LeaveType.findOrCreate({
      where: { leaveTypeName: item.leaveTypeName },
      defaults: item
    });
  }
  console.log('Default leave types ensured.');
};

// Sequential Sync
const syncDatabase = async () => {
  try {
    await LeaveType.sync({ alter: true });
    await seedLeaveTypes();

    await CompOff.sync({ alter: true });
    await Holiday.sync({ alter: true });
    await UserEmail.sync({ alter: true });

    await Leave.sync({ alter: true });
    await UserLeave.sync({ alter: true });

    console.log('Leave Service models synchronized successfully.');
  } catch (error) {
    console.error('Database synchronization failed in Leave Service:', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  Leave,
  LeaveType,
  CompOff,
  Holiday,
  UserEmail,
  UserLeave,
};
