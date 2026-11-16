require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
  user: process.env.DB_USER || 'oac_softwares',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'oac_expense_db',
  password: process.env.DB_PASSWORD || 'AWTGBVHYTUOKJK25690',
  port: process.env.DB_PORT || 5432,
});

async function fix() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Check current type and convert appropriately. If it has normal string URLs, we convert them to an array of URLs or a JSON string.
    // Let's just drop the column and recreate it if we don't care about the data, or cast it to jsonb if possible.
    // USING url::jsonb will fail if the URL is a plain string not in JSON format (e.g., 'http://example.com').
    // So we can convert it to JSON string first: USING to_jsonb(url)
    await client.query(`
      ALTER TABLE "expense" 
      ALTER COLUMN "url" TYPE JSONB 
      USING (CASE WHEN "url" IS NULL THEN NULL ELSE to_jsonb("url") END);
    `);
    
    console.log('Successfully altered url column to JSONB.');
  } catch (err) {
    console.error('Error fixing db:', err);
  } finally {
    await client.end();
  }
}
fix();
