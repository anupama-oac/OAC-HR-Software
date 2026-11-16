const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Role, User } = require('./index');
const { syncAllPostgresSequences } = require('../config/database');

module.exports = async function initializeSystem() {
  console.log('--- Starting System Initialization ---');

  try {
    await syncAllPostgresSequences();

    // 1. Define the required roles
    const requiredRoles = [
      {
        roleName: 'Super Administrator',
        abbreviation: 'SA',
        description: 'Has all permissions across the entire system',
        permissions: ['*'],
        isActive: true
      },
      {
        roleName: 'HR Administrator',
        abbreviation: 'HR',
        description: 'Full access to employee management, leaves, and onboarding modules',
        permissions: ['HR_ALL', 'EMPLOYEE_MANAGEMENT', 'LEAVE_APPROVE'],
        isActive: true
      },
      {
        roleName: 'Employee',
        abbreviation: 'EMP',
        description: 'Standard employee access',
        permissions: ['SELF_SERVICE', 'LEAVE_APPLY'],
        isActive: true
      }
    ];

    // 2. Seed roles into the database
    const roleMap = {};
    for (const roleData of requiredRoles) {
      let [role] = await Role.findOrCreate({
        where: { roleName: roleData.roleName },
        defaults: roleData
      });
      roleMap[roleData.abbreviation] = role.id;
    }

    // 3. Hash passwords securely
    const hashedSuperPassword = await bcrypt.hash('SuperAdmin@2024', 10);
    const hashedHrPassword = await bcrypt.hash('HrAdmin@2024', 10);

    // 4. Define the admin accounts
    const superUsers = [
      {
        email: 'admin@onboarddummy.com',
        empNo: 'SA001',
        password: hashedSuperPassword,
        name: 'Super Administrator',
        roleId: roleMap['SA'],
        isActive: true
      },
      {
        email: 'hr@onboarddummy.com',
        empNo: 'HR001',
        password: hashedHrPassword,
        name: 'HR Administrator',
        roleId: roleMap['HR'],
        isActive: true
      }
    ];

    // 5. Seed user accounts into the database
    for (const userData of superUsers) {
      if (!userData.roleId) {
        console.error(`Error: Could not find role for user ${userData.name}`);
        continue;
      }

      const userExists = await User.findOne({
        where: {
          [Op.or]: [{ empNo: userData.empNo }, { email: userData.email }]
        }
      });
      if (!userExists) {
        await User.create(userData);
        console.log(`✅ User created: ${userData.name} (${userData.empNo})`);
      } else {
        console.log(`ℹ️ User already exists: ${userData.name}`);
      }
    }
  } catch (err) {
    console.warn('⚠️ System Initialization warning:', err.message);
  }
};
