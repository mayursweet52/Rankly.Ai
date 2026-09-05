require('dotenv').config();
const db = require('../src/config/pgDatabase');

async function checkComplaints() {
  const res = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'complaints';
  `);
  console.log('Complaints table exists:', res.rows.length > 0);

  if (res.rows.length > 0) {
    const cols = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'complaints';
    `);
    console.log('Columns in complaints:', cols.rows);
  }

  // Also check employees table columns
  const empCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employees';
  `);
  console.log('Columns in employees:', empCols.rows.map(r => r.column_name));

  process.exit(0);
}

checkComplaints().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
