/**
 * Anti-Gravity Confidential Grievance Routes (Report to Admin Only)
 * HR cannot access admin routes; data is delivered directly to Admin
 */

const express = require('express');
const router = express.Router();
const grievanceController = require('../controllers/grievanceController');
const { isAuthenticated, requireHRMS, requireRole } = require('../middleware/auth');
const { publicLimiter, authLimiter } = require('../middleware/rateLimit');

// POST submit a confidential grievance (Any employee / HR / staff can submit)
router.post('/', isAuthenticated, requireHRMS, authLimiter, grievanceController.submitGrievance);

// GET personal grievances history for tracking (Current employee only)
router.get('/my', isAuthenticated, requireHRMS, publicLimiter, grievanceController.getMyGrievances);

// GET all grievances for the organization (Strictly Admin only - HR cannot view)
router.get('/admin', isAuthenticated, requireRole(['admin']), publicLimiter, grievanceController.getAdminGrievances);

// PATCH update status & admin resolution notes (Strictly Admin only)
router.patch('/:id/status', isAuthenticated, requireRole(['admin']), publicLimiter, grievanceController.updateGrievanceStatus);

module.exports = router;
