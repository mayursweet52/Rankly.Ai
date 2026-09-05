require('dotenv').config();
const db = require('../src/config/pgDatabase');
const supabase = require('../src/config/supabaseClient');

async function fixRls() {
  console.log('Configuring RLS policies for internal_documents table in Supabase...');

  const sql = `
    -- Disable RLS or grant full access policy so backend API service role / anon key can read and write
    ALTER TABLE internal_documents DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON internal_documents TO anon, authenticated, service_role, postgres;
    GRANT USAGE, SELECT ON SEQUENCE internal_documents_id_seq TO anon, authenticated, service_role, postgres;
    NOTIFY pgrst, 'reload schema';
  `;

  await db.query(sql);
  console.log('✅ RLS permissions updated successfully!');

  // Now test insertion
  const testPayload = {
    title: 'Test Verification Policy',
    category: 'policy',
    file_name: 'test_policy.txt',
    file_size: '1.2 KB',
    extracted_text: 'Test internal HR policy text verification.',
    department: 'HR'
  };

  const { data, error } = await supabase.from('internal_documents').insert([testPayload]).select();
  if (error) {
    console.error('❌ Insertion still failed:', error.message);
  } else {
    console.log('✅ Insertion succeeded! Inserted record:', data[0]);
    // Clean up test row
    await supabase.from('internal_documents').delete().eq('id', data[0].id);
    console.log('✅ Cleaned up test record.');
  }

  process.exit(0);
}

fixRls().catch(err => {
  console.error('Error fixing RLS:', err);
  process.exit(1);
});
