const { Sequelize } = require('sequelize');
require('dotenv').config({ override: true });

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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Expense Service: Database connection established.');
    
    if (process.env.NODE_ENV === 'development' || true) {
      await sequelize.sync({ alter: true });
      console.log('🔄 Expense Service: Database tables synced.');
    }
  } catch (error) {
    console.error('❌ Expense Service: Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
