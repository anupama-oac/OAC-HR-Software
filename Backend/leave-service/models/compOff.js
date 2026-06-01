/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */

const {DataTypes} =  require('sequelize')
const { sequelize } = require('../config/database');

 const CompOff = sequelize.define('compOff',{
    userId: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true },
    holidayId : { type : DataTypes.INTEGER, allowNull :true}
 },{
    freezeTableName :true,
    timestamps : true
 })


 CompOff.sync({alter:true})
.then(()=>console.log)

module.exports = CompOff