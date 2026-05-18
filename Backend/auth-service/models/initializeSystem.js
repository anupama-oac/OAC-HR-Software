const bcrypt = require('bcryptjs');
// CHANGE THESE: Import from the index file, not individual files
const { Role, User } = require('./index'); 

module.exports = async function initializeSystem() {
  console.log('--- Starting System Initialization ---');

  const requiredRoles = [
    {
      roleName: 'Super Administrator',
      abbreviation: 'SA',
      description: 'Has all permissions',
      permissions: ['*'],
      isActive: true
    },
    {
      roleName: 'Quality Super Administrator',
      abbreviation: 'QSA',
      description: 'Full access to quality and compliance modules',
      permissions: ['QUALITY_ALL', 'DOC_APPROVE', 'AUDIT_ALL'],
      isActive: true
    }
  ];

  const roleMap = {};
  for (const roleData of requiredRoles) {
    // findOrCreate is good, it prevents primary key violations on restart
    let [role] = await Role.findOrCreate({
      where: { roleName: roleData.roleName },
      defaults: roleData
    });
    roleMap[roleData.abbreviation] = role.id;
  }

  const hashedPassword = await bcrypt.hash('SuperAdmin@2024', 10);
  const hashedQualityPassword = await bcrypt.hash('QualityAdmin@2024', 10);

  const superUsers = [
  
    {
      email: 'qualityadmin@leedsaerospace.com',
      empNo: 'QSA001',
      password: hashedQualityPassword,
      name: 'Quality Super Administrator',
      roleId: roleMap['QSA'],
      // status: 'approved',
      isActive: true
    }
  ];

  for (const userData of superUsers) {
    // Double check that roleId was actually found
    if (!userData.roleId) {
      console.error(`Error: Could not find role for user ${userData.name}`);
      continue;
    }

    const userExists = await User.findOne({ where: { empNo: userData.empNo } });
    if (!userExists) {
      await User.create(userData);
      console.log(`✅ User created: ${userData.name} (${userData.empNo})`);
    } else {
      console.log(`ℹ️ User already exists: ${userData.name}`);
    }
  }
};