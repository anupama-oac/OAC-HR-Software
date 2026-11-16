const { DataTypes } = require("sequelize");
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('announcement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'info',
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dismissible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  freezeTableName: true,
  timestamps: true,
});

module.exports = Announcement;
