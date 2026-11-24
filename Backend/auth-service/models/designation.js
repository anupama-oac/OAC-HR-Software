/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Unified with Role table: points to the 'role' table with designationName mapped to roleName
const Designation = sequelize.define('designation', {
    designationName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'roleName'
    },
    abbreviation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    department: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'role',
    freezeTableName: true,
    timestamps: false
});

module.exports = Designation;


