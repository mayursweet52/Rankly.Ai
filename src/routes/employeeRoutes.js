/**
 * Anti-Gravity Employee Routes
 * CRUD endpoints consuming and returning the drafted JSON format
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { isAuthenticated, requireHRMS, requireRole } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');

// GET all employees formatted in Anti-Gravity schema (Internal HRMS only)
router.get('/', isAuthenticated, requireHRMS, publicLimiter, employeeController.listEmployees);

// POST create or upsert employee (Internal HR / Admin only)
router.post('/', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, employeeController.createOrUpdateEmployee);

// GET single employee by ID or employeeCode (Internal HRMS only)
router.get('/:id', isAuthenticated, requireHRMS, publicLimiter, employeeController.getEmployee);

// PUT update employee by ID (Internal HR / Admin only)
router.put('/:id', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, employeeController.createOrUpdateEmployee);

// DELETE employee by ID (Internal HR / Admin only)
router.delete('/:id', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, employeeController.deleteEmployee);

module.exports = router;
