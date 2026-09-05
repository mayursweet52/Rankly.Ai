const express = require('express');
const router = express.Router();
const db = require('../config/pgDatabase');
const { isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

/**
 * POST /api/attendance/check-in
 * Employee daily check-in
 */
router.post('/check-in', isAuthenticated, async (req, res) => {
  try {
    const employeeId = req.user.employeeId || req.body.employee_id;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile ID required for check-in.' });
    }

    const { notes } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const query = `
      INSERT INTO attendance (employee_id, date, check_in, status, notes, ip_address, created_at, updated_at)
      VALUES ($1, CURRENT_DATE, NOW(), 'present', $2, $3, NOW(), NOW())
      ON CONFLICT (employee_id, date)
      DO UPDATE SET check_in = EXCLUDED.check_in, status = 'present', updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [employeeId, notes || 'Standard Shift Check-in', ipAddress]);
    return res.status(201).json({
      success: true,
      message: '✅ Check-in recorded successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/attendance/check-out
 * Employee daily check-out
 */
router.post('/check-out', isAuthenticated, async (req, res) => {
  try {
    const employeeId = req.user.employeeId || req.body.employee_id;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile ID required for check-out.' });
    }

    const query = `
      UPDATE attendance
      SET check_out = NOW(),
          work_hours = ROUND(EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600.0, 2),
          updated_at = NOW()
      WHERE employee_id = $1 AND date = CURRENT_DATE
      RETURNING *;
    `;

    const result = await db.query(query, [employeeId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No check-in record found for today.' });
    }

    return res.json({
      success: true,
      message: '✅ Check-out recorded successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/attendance/my
 * View own attendance history
 */
router.get('/my', isAuthenticated, async (req, res) => {
  try {
    const employeeId = req.user.employeeId || req.query.employee_id;
    const result = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30;',
      [employeeId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/attendance
 * Admin & HR Manager: View organization attendance
 */
router.get('/', isAuthenticated, authorizeRoles('admin', 'hr', 'hr_manager'), async (req, res) => {
  try {
    const date = req.query.date || null;
    let query = `
      SELECT a.*, e.full_name, e.department, e.role as job_title
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
    `;
    const params = [];

    if (date) {
      query += ' WHERE a.date = $1';
      params.push(date);
    }
    query += ' ORDER BY a.date DESC, a.check_in DESC LIMIT 100;';

    const result = await db.query(query, params);
    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
