const { sequelize } = require('./config/database');

async function fix() {
  try {
    console.log('Connecting to DB to fix url column...');
    await sequelize.authenticate();
    
    // First, convert any problematic strings to valid json arrays
    await sequelize.query(`
      UPDATE "expense"
      SET "url" = '[]'::jsonb
      WHERE "url"::text IS NULL OR "url"::text = '' OR TRIM("url"::text) = '""' OR "url"::text = 'null';
    `);
    
    await sequelize.query(`
      UPDATE "expense"
      SET "url" = jsonb_build_array("url")
      WHERE jsonb_typeof("url") = 'string';
    `);
    
    console.log('Successfully altered url column to JSONB with data migration.');
  } catch (error) {
    console.error('Error fixing db:', error);
  } finally {
    await sequelize.close();
  }
}

fix();
