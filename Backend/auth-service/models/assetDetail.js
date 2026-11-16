const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const Asset = require('./asset');

const AssetDetail = sequelize.define('assetDetail', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userAssetId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assignedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  returnDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Assigned'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  freezeTableName: true,
  timestamps: true
});

AssetDetail.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AssetDetail.belongsTo(Asset, { foreignKey: 'userAssetId', as: 'userAsset' });

module.exports = AssetDetail;
