const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');
const verifyToken = require('./verifyToken');

router.get('/employees', verifyToken, employeeController.getAllEmployees);
module.exports = router;
