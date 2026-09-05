require('dotenv').config();
const db = require('../src/config/pgDatabase');
const supabase = require('../src/config/supabaseClient');

async function setupComplaints() {
  console.log('Creating complaints table and updating employees table in Supabase PostgreSQL...');

  const ddl = `
    -- 1. Ensure employees table has alias column 'name' for PostgREST joins
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'name'
      ) THEN
        ALTER TABLE employees ADD COLUMN name VARCHAR(255) GENERATED ALWAYS AS (full_name) STORED;
      END IF;
    END $$;

    -- 2. Create complaints table
    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      employee_id INT REFERENCES employees(employee_id) ON DELETE SET NULL,
      category VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      is_anonymous BOOLEAN DEFAULT false,
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. Configure permissions & RLS
    ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON complaints TO anon, authenticated, service_role, postgres;
    GRANT USAGE, SELECT ON SEQUENCE complaints_id_seq TO anon, authenticated, service_role, postgres;

    -- 4. Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  await db.query(ddl);
  console.log('✅ PostgreSQL DDL executed successfully!');

  // Test insert and select with join via Supabase Client
  const testComplaint = {
    employee_id: 101,
    category: 'Workplace',
    subject: 'Air conditioning calibration in Engineering bay',
    description: 'The HVAC unit in section B is running too cold during afternoon hours.',
    is_anonymous: false,
    status: 'Pending'
  };

  const { data: insData, error: insErr } = await supabase
    .from('complaints')
    .insert([testComplaint])
    .select();

  if (insErr) {
    console.error('❌ Supabase insert error:', insErr.message);
  } else {
    console.log('✅ Supabase complaint insert succeeded! ID:', insData[0].id);

    // Test select with employees join
    const { data: selData, error: selErr } = await supabase
      .from('complaints')
      .select('*, employees(name, email)')
      .eq('id', insData[0].id);

    if (selErr) {
      console.log('Notice on join query:', selErr.message);
    } else {
      console.log('✅ Supabase join query succeeded:', JSON.stringify(selData[0], null, 2));
    }

    // Cleanup test record
    await supabase.from('complaints').delete().eq('id', insData[0].id);
    console.log('✅ Cleaned up test record.');
  }

  process.exit(0);
}

setupComplaints().catch(err => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
