const { sequelize } = require('../config/database');
const User = require('./user');
const Role = require('./role');
const Designation = require('./designation');
const Promotion = require('./promotion');
const UserAccount = require('./userAccount');
const UserPersonal = require('./userPersonal');
const UserPosition = require('./userPosition');
const StatutoryInfo = require('./statutoryInfo');
const UserDocument = require('./userDocument');
const Notification = require('./notification');

// Include missing models if present in directory:
const UserAsset = require('./userAsset');
const UserQualification = require('./userQualification');
const UserNominee = require('./userNominee');


// --- Organizational Associations ---

// Role <-> User (Single definition using explicit aliases)
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// Role <-> Designation
Role.hasOne(Designation, { foreignKey: 'roleId' });
Designation.belongsTo(Role, { foreignKey: 'roleId' });

Designation.hasMany(UserPosition, { foreignKey: 'designationId' });
UserPosition.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });

// ----------------------------------------------------

// Reporting Manager Self-Association (Using reportingMangerId)
User.hasMany(UserPersonal, { foreignKey: 'reportingMangerId', as: 'Subordinates' });
UserPersonal.belongsTo(User, { foreignKey: 'reportingMangerId', as: 'ReportingManager' });

// Notifications
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });


// --- User Profile Extensions (Strict One-to-One) ---

// 1. Define UserPersonal explicitly with alias 'userPersonal' to resolve collision
User.hasOne(UserPersonal, { foreignKey: 'userId', as: 'userPersonal', onDelete: 'CASCADE' });
UserPersonal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 2. Loop remaining profile extension models
const profileModels = [
  { model: UserAccount, as: 'userAccount' },
  { model: UserPosition, as: 'userPosition' },
  { model: StatutoryInfo, as: 'statutoryInfo' },
  { model: UserAsset, as: 'userAsset' },
  { model: UserQualification, as: 'userQualification' },
  { model: UserNominee, as: 'userNominee' }
];

profileModels.forEach(({ model, as }) => {
  if (model) {
    User.hasOne(model, { foreignKey: 'userId', as, onDelete: 'CASCADE' });
    model.belongsTo(User, { foreignKey: 'userId' });
  }
});


// --- Records & History (One-to-Many) ---
User.hasMany(Promotion, { foreignKey: 'userId', onDelete: 'CASCADE' });
Promotion.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserDocument, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserDocument.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Role,
  Designation,
  Promotion,
  UserAccount,
  UserPersonal,
  UserPosition,
  StatutoryInfo,
  UserDocument,
  Notification,
  UserAsset,
  UserQualification,
  UserNominee
};