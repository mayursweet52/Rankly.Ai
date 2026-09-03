/**
 * Anti-Gravity Skill Marketplace Routes
 */

const express = require('express');
const router = express.Router();
const skillMarketplaceController = require('../controllers/skillMarketplaceController');
const { optionalAuth } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');

// Catalog
router.get('/', optionalAuth, publicLimiter, skillMarketplaceController.listSkills);
router.post('/', optionalAuth, publicLimiter, skillMarketplaceController.createSkill);

// Assignments & Training
router.post('/assign', optionalAuth, publicLimiter, skillMarketplaceController.assignSkill);
router.post('/training', optionalAuth, publicLimiter, skillMarketplaceController.recommendTrainingCourse);

// Employee Snapshot (Page 4 JSON)
router.get('/employees/:employeeId', optionalAuth, publicLimiter, skillMarketplaceController.getEmployeeMarketplace);

module.exports = router;
