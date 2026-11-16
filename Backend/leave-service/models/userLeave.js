const {DataTypes} =  require('sequelize')
const { sequelize } = require('../config/database');
const LeaveType = require('../models/leaveType');
const User = require('../../auth-service/models');

 const UserLeave = sequelize.define('userLeave',{
   userId : {type : DataTypes.INTEGER, allowNull : true},
   leaveTypeId : { type: DataTypes.INTEGER, allowNull:true},
   noOfDays : {type: DataTypes.FLOAT, allowNull:true, defaultValue: 0},
   takenLeaves : {type :DataTypes.FLOAT, allowNull :true, defaultValue: 0},
   leaveBalance : { type:DataTypes.FLOAT, allowNull:true, defaultValue: 0},
   year : {type: DataTypes.INTEGER}
 },{
    freezeTableName :true,
    timestamps : true,
    tableName: 'userLeave'
 })

if (!LeaveType.associations || !LeaveType.associations.userLeaves) {
  LeaveType.hasMany(UserLeave, { foreignKey: 'leaveTypeId', as: 'userLeaves', onUpdate: 'CASCADE' });
}
if (!UserLeave.associations || !UserLeave.associations.leaveType) {
  UserLeave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
}

module.exports = UserLeave;