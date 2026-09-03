const express = require('express');
const router = express.Router();
const db = require('./db');

// Ensure PostgreSQL employees table exists
let tableInitialized = false;
async function ensureTable() {
  if (!tableInitialized) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      tableInitialized = true;
    } catch (err) {
      // Handled per query
    }
  }
}

router.post('/employees', async (req, res) => {
  try {
    await ensureTable();
    const { name, role, department } = req.body;
    const result = await db.query('INSERT INTO employees (name, role, department) VALUES ($1, $2, $3) RETURNING *', [name, role, department]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

router.get('/employees', async (req, res) => {
  try {
    await ensureTable();
    const result = await db.query('SELECT * FROM employees');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    await ensureTable();
    const { name, role, department } = req.body;
    const result = await db.query('UPDATE employees SET name = $1, role = $2, department = $3 WHERE id = $4 RETURNING *', [name, role, department, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await ensureTable();
    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

module.exports = router;
