const express = require('express');
const router = express.Router();
const db = require('../config/pgDatabase');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

async function resolveEmployeeId(req) {
  if (req.user && req.user.employeeId) return parseInt(req.user.employeeId, 10);
  if (req.body && req.body.employee_id) return parseInt(req.body.employee_id, 10);
  if (req.query && req.query.employee_id) return parseInt(req.query.employee_id, 10);
  if (req.user && req.user.email) {
    try {
      const emp = await db.query('SELECT employee_id FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1;', [req.user.email]);
      if (emp.rows.length > 0) return emp.rows[0].employee_id;
    } catch(e) {}
  }
  try {
    const first = await db.query('SELECT employee_id FROM employees ORDER BY employee_id ASC LIMIT 1;');
    if (first.rows.length > 0) return first.rows[0].employee_id;
  } catch(e) {}
  return 101;
}

/**
 * GET /api/attendance/today
 * Check today's punch in / punch out status
 */
router.get('/today', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    const result = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE LIMIT 1;',
      [employeeId]
    );
    const today = result.rows[0] || null;

    let isCheckedIn = false;
    let isCheckedOut = false;

    if (today && today.check_in) {
      if (!today.check_out) {
        isCheckedIn = true;
        isCheckedOut = false;
      } else {
        const inTime = new Date(today.check_in).getTime();
        const outTime = new Date(today.check_out).getTime();
        if (inTime > outTime) {
          isCheckedIn = true;
          isCheckedOut = false;
        } else {
          isCheckedIn = false;
          isCheckedOut = true;
        }
      }
    }

    return res.json({
      success: true,
      employeeId,
      today,
      isCheckedIn,
      isCheckedOut
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/attendance/check-in
 * Employee daily check-in / Punch In
 */
router.post('/check-in', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile ID required for check-in.' });
    }

    const { notes } = req.body || {};
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const query = `
      INSERT INTO attendance (employee_id, date, check_in, status, notes, ip_address, created_at, updated_at)
      VALUES ($1, CURRENT_DATE, NOW(), 'present', $2, $3, NOW(), NOW())
      ON CONFLICT (employee_id, date)
      DO UPDATE SET check_in = NOW(), check_out = NULL, status = 'present', notes = EXCLUDED.notes, ip_address = EXCLUDED.ip_address, updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [employeeId, notes || 'Live Shift Check-in', ipAddress]);
    return res.status(201).json({
      success: true,
      message: '✅ Punch In recorded successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/attendance/check-out
 * Employee daily check-out / Punch Out
 */
router.post('/check-out', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile ID required for check-out.' });
    }

    const { notes } = req.body || {};
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const query = `
      INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, status, notes, ip_address, created_at, updated_at)
      VALUES ($1, CURRENT_DATE, NOW() - INTERVAL '8 hours', NOW(), 8.0, 'present', $2, $3, NOW(), NOW())
      ON CONFLICT (employee_id, date)
      DO UPDATE SET check_out = NOW(),
          work_hours = ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(attendance.check_in, NOW()))) / 3600.0, 2),
          status = 'present',
          updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [employeeId, notes || 'Shift Checkout', ipAddress]);

    return res.json({
      success: true,
      message: '✅ Punch Out recorded successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Check-out error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/attendance/my
 * View own attendance history
 */
router.get('/my', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
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
