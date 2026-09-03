/**
 * Anti-Gravity Employee Routes
 * CRUD endpoints consuming and returning the drafted JSON format
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { optionalAuth } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');

// GET all employees formatted in Anti-Gravity schema
router.get('/', optionalAuth, publicLimiter, employeeController.listEmployees);

// POST create or upsert employee from Anti-Gravity JSON
router.post('/', optionalAuth, publicLimiter, employeeController.createOrUpdateEmployee);

// GET single employee by ID or employeeCode
router.get('/:id', optionalAuth, publicLimiter, employeeController.getEmployee);

// PUT update employee by ID
router.put('/:id', optionalAuth, publicLimiter, employeeController.createOrUpdateEmployee);

// DELETE employee by ID
router.delete('/:id', optionalAuth, publicLimiter, employeeController.deleteEmployee);

module.exports = router;
