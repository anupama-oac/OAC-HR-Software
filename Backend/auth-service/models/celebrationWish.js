const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CelebrationWish = sequelize.define('celebration_wish', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'birthday' | 'anniversary'
    allowNull: false,
    defaultValue: 'birthday'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'celebration_wish',
  freezeTableName: true,
  timestamps: true
});

module.exports = CelebrationWish;

