require('dotenv').config();
const db = require('../src/config/pgDatabase');
const supabase = require('../src/config/supabaseClient');

async function setupTable() {
  console.log('Verifying internal_documents table...');
  await db.query("NOTIFY pgrst, 'reload schema';");
  
  const res = await db.query('SELECT * FROM internal_documents LIMIT 5;');
  console.log('✅ PostgreSQL query successful. Current row count:', res.rows.length);

  // Also verify via Supabase REST API client
  setTimeout(async () => {
    try {
      const { data, error } = await supabase.from('internal_documents').select('*');
      if (error) {
        console.log('Supabase JS client notice:', error.message);
      } else {
        console.log('✅ Supabase JS client verified! Documents count:', data.length);
      }
    } catch (e) {
      console.log('Supabase client error:', e.message);
    }
    process.exit(0);
  }, 2000);
}

setupTable().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
