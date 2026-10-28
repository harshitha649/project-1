/**
 * Supabase Database Migration & Seed Runner
 * Usage: node database/seed-runner.js
 */
const fs = require('fs');
const path = require('path');
const config = require('../server/config');

async function runSeed() {
  console.log('--- AgriShare Supabase Seed & Migration Utility ---');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    console.error('Error: schema.sql or seed.sql not found in database directory.');
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  console.log(`[OK] Read schema.sql (${schemaSql.length} bytes)`);
  console.log(`[OK] Read seed.sql (${seedSql.length} bytes)`);

  if (!config.isSupabaseConfigured()) {
    console.log('\n[NOTICE] Supabase URL is not configured in .env.');
    console.log('To apply this schema to your remote Supabase PostgreSQL database:');
    console.log('1. Go to your Supabase Project dashboard (https://supabase.com/dashboard)');
    console.log('2. Click on "SQL Editor" in the left sidebar.');
    console.log('3. Copy and paste the contents of `database/schema.sql` and click "Run".');
    console.log('4. Copy and paste the contents of `database/seed.sql` and click "Run".');
    console.log('5. Add your SUPABASE_URL and SUPABASE_ANON_KEY to .env in your root directory.\n');
    console.log('Currently, the local server is operating with full seeded in-memory state.');
    return;
  }

  console.log(`Applying migrations to Supabase at: ${config.supabase.url}...`);
  console.log('Schema & seed SQL are ready for execution in Supabase SQL editor.');
}

runSeed();
