const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const ltCtrl = require('../controllers/leaveTypeController');
const lbCtrl = require('../controllers/leaveBalanceController');
const lrCtrl = require('../controllers/leaveRequestController');
const holCtrl = require('../controllers/holidayController');

router.use(isAuthenticated);

// ========== LEAVE TYPES (Admin) ==========
router.get('/types', ltCtrl.getLeaveTypes);
router.post('/types', requirePermission('leave', 'add'), ltCtrl.createLeaveType);
router.put('/types/:id', requirePermission('leave', 'edit'), ltCtrl.updateLeaveType);
router.delete('/types/:id', requirePermission('leave', 'delete'), ltCtrl.deleteLeaveType);

// ========== BALANCES ==========
router.get('/balances/me', lbCtrl.getMyBalances);
router.get('/balances/:employeeId', requirePermission('leave', 'view'), lbCtrl.getEmployeeBalances);
router.post('/balances/adjust', requirePermission('leave', 'edit'), lbCtrl.adjustBalance);
router.post('/balances/run-accrual', requirePermission('leave', 'edit'), lbCtrl.runYearlyAccrual);
router.get('/accrual-log', requirePermission('leave', 'view'), lbCtrl.getAccrualLog);

// ========== REQUESTS ==========
router.get('/requests', requirePermission('leave', 'view'), lrCtrl.getLeaveRequests);
router.get('/requests/me/pending-approvals', lrCtrl.getMyPendingApprovals);
router.get('/requests/team-calendar', lrCtrl.getTeamCalendar);
router.get('/requests/:id', lrCtrl.getLeaveRequest);
router.post('/requests', requirePermission('leave', 'add'), lrCtrl.applyLeave);
router.put('/requests/:id/approve', lrCtrl.approveLeave);
router.put('/requests/:id/reject', lrCtrl.rejectLeave);
router.put('/requests/:id/cancel', lrCtrl.cancelLeave);

// ========== HOLIDAYS ==========
router.get('/holidays', holCtrl.getHolidays);
router.post('/holidays', requirePermission('leave', 'add'), holCtrl.createHoliday);
router.put('/holidays/:id', requirePermission('leave', 'edit'), holCtrl.updateHoliday);
router.delete('/holidays/:id', requirePermission('leave', 'delete'), holCtrl.deleteHoliday);

module.exports = router;
