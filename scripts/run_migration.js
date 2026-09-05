const fs = require('fs');
const path = require('path');
const db = require('../src/config/pgDatabase');

async function runMigration() {
  const sqlPath = path.join(__dirname, 'migrations', '001_create_applications_and_audit_logs.sql');
  console.log('Reading migration file:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to PostgreSQL / Supabase and applying migration...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration applied successfully!');

    // Verify applications table
    const appCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'applications' 
      ORDER BY ordinal_position
    `);
    console.log('\n📋 applications table columns:');
    console.table(appCols.rows);

    // Verify audit_logs table
    const auditCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'audit_logs' 
      ORDER BY ordinal_position
    `);
    console.log('\n📋 audit_logs table columns:');
    console.table(auditCols.rows);

    // Verify constraints
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname IN ('applications', 'audit_logs')
    `);
    console.log('\n🔒 Table Constraints:');
    console.table(constraints.rows);

    // Verify RLS status
    const rls = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('applications', 'audit_logs')
    `);
    console.log('\n🛡️ Row-Level Security (RLS) Status:');
    console.table(rls.rows);

    // Verify Triggers
    const trgs = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('applications', 'audit_logs')
    `);
    console.log('\n⚡ Triggers:');
    console.table(trgs.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
