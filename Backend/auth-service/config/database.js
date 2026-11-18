const { Sequelize } = require('sequelize');
require('dotenv').config({ override: true });

const sequelize = new Sequelize(
  process.env.AUTH_DB_NAME || process.env.DB_NAME,
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

const syncAllPostgresSequences = async () => {
  try {
    await sequelize.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT
            c.relname AS table_name,
            a.attname AS column_name,
            pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = c.oid
          WHERE n.nspname = 'public'
            AND c.relkind = 'r'
            AND a.attnum > 0
            AND NOT a.attisdropped
            AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL
        ) LOOP
          EXECUTE format(
            'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM public.%I), 0) + 1, false)',
            r.seq_name,
            r.column_name,
            r.table_name
          );
        END LOOP;
      END $$;
    `);
    console.log('✅ Auth Service: PostgreSQL primary key sequences synchronized.');
  } catch (seqErr) {
    console.warn('⚠️ Auth Service: Could not synchronize sequences:', seqErr.message);
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Auth Service: Database connection established.');
    
    if (process.env.NODE_ENV === 'development') {
      try {
        // Use alter: true to update schema safely without dropping tables
        await sequelize.sync({ alter: true });
        console.log('🔄 Auth Service: Database tables synced.');
      } catch (syncError) {
        console.warn('⚠️ Auth Service: Schema alter sync encountered a constraint notice:', syncError.message);
        // Fallback to safe sync without attempting to drop or re-create constraints
        await sequelize.sync();
        console.log('🔄 Auth Service: Database tables verified.');
      }
    } else {
      await sequelize.sync();
      console.log('🔄 Auth Service: Missing database tables created.');
    }

    await syncAllPostgresSequences();
  } catch (error) {
    console.error('❌ Auth Service: Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, syncAllPostgresSequences };
