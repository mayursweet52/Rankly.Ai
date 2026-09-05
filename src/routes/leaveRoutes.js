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
 * GET /api/leaves/summary
 * Employee leave balance & pending counts
 */
router.get('/summary', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    const leavesRes = await db.query('SELECT * FROM leave_requests WHERE employee_id = $1;', [employeeId]);
    const leaves = leavesRes.rows || [];
    
    const casualUsed = leaves.filter(l => l.leave_type === 'casual' && l.status === 'approved').reduce((acc, c) => acc + (parseFloat(c.days_count) || 1), 0);
    const sickUsed = leaves.filter(l => l.leave_type === 'sick' && l.status === 'approved').reduce((acc, c) => acc + (parseFloat(c.days_count) || 1), 0);
    const paidUsed = leaves.filter(l => l.leave_type === 'paid' && l.status === 'approved').reduce((acc, c) => acc + (parseFloat(c.days_count) || 1), 0);
    const pendingCount = leaves.filter(l => l.status === 'pending').length;

    return res.json({
      success: true,
      employeeId,
      balances: {
        casual: Math.max(0, 12 - casualUsed),
        casualTotal: 12,
        sick: Math.max(0, 7 - sickUsed),
        sickTotal: 7,
        paid: Math.max(0, 18 - paidUsed),
        paidTotal: 18,
        pendingCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leaves/apply
 * Employee applies for leave
 */
router.post('/apply', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    const { leave_type, start_date, end_date, days_count, reason } = req.body;

    if (!employeeId || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'start_date, end_date, and reason are required.'
      });
    }

    const query = `
      INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, days_count, reason, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
      RETURNING *;
    `;

    const result = await db.query(query, [
      employeeId,
      leave_type || 'casual',
      start_date,
      end_date,
      days_count || 1.0,
      reason
    ]);

    return res.status(201).json({
      success: true,
      message: '✅ Leave request submitted successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Leave apply error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/leaves/my
 * View own leave request history
 */
router.get('/my', optionalAuth, async (req, res) => {
  try {
    const employeeId = await resolveEmployeeId(req);
    const result = await db.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC;',
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
 * GET /api/leaves
 * Admin & HR Manager: View all leave requests
 */
router.get('/', isAuthenticated, authorizeRoles('admin', 'hr', 'hr_manager'), async (req, res) => {
  try {
    const status = req.query.status || null;
    let query = `
      SELECT l.*, e.full_name, e.department, e.role as job_title
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.employee_id
    `;
    const params = [];

    if (status) {
      query += ' WHERE l.status = $1';
      params.push(status);
    }
    query += ' ORDER BY l.created_at DESC LIMIT 100;';

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

/**
 * PATCH /api/leaves/:id/review
 * Admin & HR Manager: Approve or Reject leave request (403 for unauthorized employees)
 */
router.patch('/:id/review', isAuthenticated, authorizeRoles('admin', 'hr', 'hr_manager'), async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { status, review_remarks } = req.body;
    const reviewerId = req.user.employeeId || req.user.id;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved, rejected, or cancelled.'
      });
    }

    const query = `
      UPDATE leave_requests
      SET status = $1,
          reviewed_by = $2,
          review_remarks = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;

    const result = await db.query(query, [status, reviewerId, review_remarks || null, leaveId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    return res.json({
      success: true,
      message: `✅ Leave request ${status} successfully.`,
      data: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
