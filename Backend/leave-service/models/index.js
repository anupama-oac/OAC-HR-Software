const { sequelize } = require('../config/database');

const Leave = require('./leave');
const LeaveType = require('./leaveType');
const CompOff = require('./compOff');
const Holiday = require('./holiday');
const UserEmail = require('./userEmail');
const UserLeave = require('./userLeave');

// Define All Associations
LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId', as: 'leaves', onUpdate: 'CASCADE' });
Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

LeaveType.hasMany(UserLeave, { foreignKey: 'leaveTypeId', onUpdate: 'CASCADE' });
UserLeave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

// Default Seed Logic
const seedLeaveTypes = async () => {
  const count = await LeaveType.count();
  if (count === 0) {
    await LeaveType.bulkCreate([
      { leaveTypeName: 'Casual Leave' },
      { leaveTypeName: 'Sick Leave' },
      { leaveTypeName: 'LOP' },
      { leaveTypeName: 'Comp Off' },
    ]);
    console.log('Default leave types seeded.');
  }
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