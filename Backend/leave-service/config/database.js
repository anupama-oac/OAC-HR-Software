const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000
    }
  }
);

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Auth Service: Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Auth Service: Unable to connect to database:', error);
    return false;
  }
}

sequelize.testConnection = testConnection; 
module.exports = sequelize;

// module.exports = { sequelize, testConnection };