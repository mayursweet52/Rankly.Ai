const express = require('express');
const router = express.Router();
const db = require('./db');

/**
 * POST /employees
 * Inserts employee into Supabase PostgreSQL (Supports full 14 fields and legacy payload)
 */
router.post('/employees', async (req, res) => {
  try {
    const fullName = req.body.full_name || req.body.name || 'Employee';
    const email = req.body.email || `emp_${Date.now()}@antigravity.io`;
    const role = req.body.role || 'Staff';
    const department = req.body.department || 'General';
    const joiningDate = req.body.joining_date || new Date().toISOString().split('T')[0];
    const contactNumber = req.body.contact_number || null;
    const status = req.body.status || 'Active';
    const homeAddress = typeof req.body.home_address === 'object' ? JSON.stringify(req.body.home_address) : (req.body.home_address || null);
    const emergencyContact = typeof req.body.emergency_contact === 'object' ? JSON.stringify(req.body.emergency_contact) : (req.body.emergency_contact || null);
    const reportingManagerId = req.body.reporting_manager_id ? parseInt(req.body.reporting_manager_id, 10) || null : null;
    const bankAccountDetails = req.body.bank_account_details ? JSON.stringify(req.body.bank_account_details) : null;
    const salaryInfo = req.body.salary_info ? JSON.stringify(req.body.salary_info) : null;
    const accessControlLevel = req.body.access_control_level || 'Level_1';

    const queryText = `
      INSERT INTO employees (
        full_name, email, role, department, joining_date,
        contact_number, status, home_address, emergency_contact,
        reporting_manager_id, bank_account_details, salary_info, access_control_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      fullName, email, role, department, joiningDate,
      contactNumber, status, homeAddress, emergencyContact,
      reportingManagerId, bankAccountDetails, salaryInfo, accessControlLevel
    ];

    const result = await db.query(queryText, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

/**
 * GET /employees
 * Retrieves all employees from Supabase PostgreSQL
 */
router.get('/employees', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM employees ORDER BY employee_id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

/**
 * GET /employees/:id
 * Retrieves single employee by employee_id from Supabase PostgreSQL
 */
router.get('/employees/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: `Employee ${req.params.id} not found` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

/**
 * PUT /employees/:id
 * Updates employee in Supabase PostgreSQL
 */
router.put('/employees/:id', async (req, res) => {
  try {
    const fullName = req.body.full_name || req.body.name;
    const role = req.body.role;
    const department = req.body.department;
    const status = req.body.status;

    const result = await db.query(`
      UPDATE employees 
      SET 
        full_name = COALESCE($1, full_name), 
        role = COALESCE($2, role), 
        department = COALESCE($3, department),
        status = COALESCE($4, status)
      WHERE employee_id = $5 
      RETURNING *;
    `, [fullName, role, department, status, req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: `Employee ${req.params.id} not found` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

/**
 * DELETE /employees/:id
 * Removes employee from Supabase PostgreSQL
 */
router.delete('/employees/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employees WHERE employee_id = $1', [req.params.id]);
    res.json({ message: 'Employee deleted', employee_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
});

module.exports = router;
