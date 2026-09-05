require('dotenv').config();
const db = require('../src/config/pgDatabase');
const supabase = require('../src/config/supabaseClient');

async function setupTables() {
  console.log('🔄 Creating attendance & leave_requests tables in Supabase PostgreSQL...');

  const ddl = `
    -- 1. Create attendance table
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      check_in TIMESTAMP WITH TIME ZONE,
      check_out TIMESTAMP WITH TIME ZONE,
      work_hours NUMERIC(4,2),
      status VARCHAR(50) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'late', 'on_leave', 'remote')),
      notes TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_emp_date UNIQUE (employee_id, date)
    );

    -- 2. Create leave_requests table
    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
      leave_type VARCHAR(50) DEFAULT 'casual' CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count NUMERIC(4,1) DEFAULT 1.0,
      reason TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
      reviewed_by INT REFERENCES employees(employee_id) ON DELETE SET NULL,
      review_remarks TEXT,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. Grant Permissions to service_role, postgres, authenticated, anon
    GRANT ALL ON attendance TO anon, authenticated, service_role, postgres;
    GRANT USAGE, SELECT ON SEQUENCE attendance_id_seq TO anon, authenticated, service_role, postgres;
    GRANT ALL ON leave_requests TO anon, authenticated, service_role, postgres;
    GRANT USAGE, SELECT ON SEQUENCE leave_requests_id_seq TO anon, authenticated, service_role, postgres;

    -- 4. Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  await db.query(ddl);
  console.log('✅ attendance and leave_requests tables created successfully in Supabase PostgreSQL.');

  // Test inserting sample attendance and leave records if empty
  const countAtt = await db.query('SELECT COUNT(*) FROM attendance;');
  if (parseInt(countAtt.rows[0].count, 10) === 0) {
    const empRes = await db.query('SELECT employee_id FROM employees LIMIT 1;');
    if (empRes.rows.length > 0) {
      const empId = empRes.rows[0].employee_id;
      await db.query(`
        INSERT INTO attendance (employee_id, date, check_in, status, notes)
        VALUES ($1, CURRENT_DATE, NOW(), 'present', 'Morning Shift Check-in')
        ON CONFLICT (employee_id, date) DO NOTHING;
      `, [empId]);
      await db.query(`
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_count, reason, status)
        VALUES ($1, 'casual', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days', 2.0, 'Family function', 'pending');
      `, [empId]);
      console.log(`✅ Sample attendance and leave records inserted for employee_id=${empId}`);
    }
  }

  process.exit(0);
}

setupTables().catch(err => {
  console.error('❌ Error setting up attendance and leave tables:', err);
  process.exit(1);
});
