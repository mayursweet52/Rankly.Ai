const { pool } = require('../src/config/pgDatabase');

const tables = [
  'employees',
  'ai_agents',
  'agent_conversations',
  'agent_email_drafts',
  'agent_analytics_metrics',
  'skills',
  'employee_skills',
  'recommended_training'
];

async function applyRLSPolicies() {
  console.log('🔄 Connecting to Supabase PostgreSQL...');
  
  for (const table of tables) {
    try {
      // 1. Drop existing policy if present
      await pool.query(`DROP POLICY IF EXISTS "Allow public full access" ON ${table};`);
      
      // 2. Create full access policy for public/anon/authenticated
      await pool.query(`CREATE POLICY "Allow public full access" ON ${table} FOR ALL TO public USING (true) WITH CHECK (true);`);
      
      console.log(`✅ [${table}] Policy "Allow public full access" applied.`);
    } catch (err) {
      console.error(`❌ Error on table ${table}:`, err.message);
    }
  }

  const result = await pool.query("SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';");
  console.log('\n📋 Active Supabase RLS Policies:');
  console.table(result.rows);

  await pool.end();
  process.exit(0);
}

applyRLSPolicies().catch(e => {
  console.error(e);
  process.exit(1);
});
