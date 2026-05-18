const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Team = sequelize.define(
  'Team',
  {
    teamName: { type: DataTypes.STRING, allowNull: false }
  },
  { freezeTableName: true }
);

const TeamLeader = sequelize.define(
  'TeamLeader',
  {
    teamId: { type: DataTypes.INTEGER },
    userId: { type: DataTypes.INTEGER }
  },
  { freezeTableName: true }
);

const TeamMember = sequelize.define(
  'TeamMember',
  {
    teamId: { type: DataTypes.INTEGER },
    userId: { type: DataTypes.INTEGER }
  },
  { freezeTableName: true }
);

module.exports = { Team, TeamLeader, TeamMember };
