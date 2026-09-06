const express = require('express');
const router = express.Router();
const db = require('../config/pgDatabase');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const realtimeNotificationService = require('../services/realtimeNotificationService');

/**
 * Smart Leave Calculator (Weekend Exclusion Logic)
 * Excludes Saturdays (Day 6) and Sundays (Day 0) automatically.
 * E.g., Thursday to Tuesday -> Thu, Fri, Mon, Tue = 4 working days (Sat & Sun excluded).
 */
function calculateWorkingDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  
  // Clean YYYY-MM-DD parsing to avoid timezone-induced date shifts
  const cleanStart = String(startDateStr).split('T')[0].trim();
  const cleanEnd = String(endDateStr).split('T')[0].trim();

  const [sY, sM, sD] = cleanStart.split('-').map(Number);
  const [eY, eM, eD] = cleanEnd.split('-').map(Number);

  if (!sY || !sM || !sD || !eY || !eM || !eD) return 0;

  const start = new Date(Date.UTC(sY, sM - 1, sD));
  const end = new Date(Date.UTC(eY, eM - 1, eD));

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  let cur = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return count;
}

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
 * GET /api/leaves/calculate-days
 * Smart Leave Calculator API: Preview working days excluding weekends
 */
router.get('/calculate-days', optionalAuth, (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'start_date and end_date query parameters are required.' });
    }

    const workingDays = calculateWorkingDays(start_date, end_date);
    const start = new Date(start_date);
    const end = new Date(end_date);
    const totalCalendarDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const weekendDaysExcluded = Math.max(0, totalCalendarDays - workingDays);

    return res.json({
      success: true,
      startDate: start_date,
      endDate: end_date,
      workingDays,
      totalCalendarDays: Math.max(0, totalCalendarDays),
      weekendDaysExcluded,
      logic: 'Excludes Saturdays and Sundays automatically'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
 * Employee applies for leave with Smart Weekend Exclusion
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

    // Smart Weekend Exclusion: calculate actual working days
    const computedWorkingDays = calculateWorkingDays(start_date, end_date);
    const finalDaysCount = computedWorkingDays > 0 ? computedWorkingDays : (parseFloat(days_count) || 1.0);

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
      finalDaysCount,
      reason
    ]);

    const createdLeave = result.rows[0];

    // Fetch employee name for live Supabase notification
    let empName = 'Staff Member';
    try {
      const empRes = await db.query('SELECT full_name FROM employees WHERE employee_id = $1 LIMIT 1;', [employeeId]);
      if (empRes.rows.length > 0) empName = empRes.rows[0].full_name;
    } catch(e) {}

    // Trigger Supabase Realtime Notification
    realtimeNotificationService.notifyLeaveRequested({
      ...createdLeave,
      employeeName: empName
    }).catch(e => console.warn('Realtime notify failed:', e.message));

    return res.status(201).json({
      success: true,
      message: `✅ Leave request submitted successfully (${finalDaysCount} working day(s) counted, weekends excluded).`,
      data: createdLeave,
      workingDays: finalDaysCount
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

    const updatedLeave = result.rows[0];

    // Trigger Supabase Realtime Event
    realtimeNotificationService.notifyLeaveReviewed(updatedLeave)
      .catch(e => console.warn('Realtime notify failed:', e.message));

    return res.json({
      success: true,
      message: `✅ Leave request ${status} successfully.`,
      data: updatedLeave
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
