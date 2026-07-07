// database.js
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
    // Only log SQL queries in development to keep production logs clean
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅Payroll Service: Database connection established.');
    
    // SYNC LOGIC HERE
    if (process.env.NODE_ENV === 'development') {
      // alter: true updates tables to match models without dropping data
      await sequelize.sync({ alter: true });
      console.log('🔄Payroll Service: Database tables synced');
    }

  } catch (error) {
    console.error('❌Payroll Service: Database connection failed:', error);
    process.exit(1); // Stop the microservice if DB isn't ready
  }
};

module.exports = { sequelize, connectDB };