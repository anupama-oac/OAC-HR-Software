const sequelize = require('../config/database');
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


// --- Organizational Associations ---

 
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User);


Role.hasMany(User, { foreignKey: 'roleId', onUpdate: 'CASCADE' });
User.belongsTo(Role);

// Add this to your models/index.js if it's not there!
User.hasMany(UserPersonal, { foreignKey: 'reportingMangerId', as: 'Subordinates' });
UserPersonal.belongsTo(User, { foreignKey: 'reportingMangerId', as: 'ReportingManager' });

Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId' });

Role.hasOne(Designation, { foreignKey: 'roleId' });
Designation.belongsTo(Role, { foreignKey: 'roleId' });

// --- User Profile Extensions (Strict One-to-One) ---
// Using CASCADE ensures if a user is deleted, all their sub-data is wiped
const profileModels = [UserAccount, UserPersonal, UserPosition, StatutoryInfo];
profileModels.forEach(model => {
    User.hasOne(model, { foreignKey: 'userId', onDelete: 'CASCADE' });
    model.belongsTo(User, { foreignKey: 'userId' });
});

// --- Records & History (One-to-Many) ---
User.hasMany(Promotion, { foreignKey: 'userId', onDelete: 'CASCADE' });
Promotion.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(UserDocument, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserDocument.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize, User, Role, Designation, Promotion, 
  UserAccount, UserPersonal, UserPosition, StatutoryInfo, UserDocument, Notification
};