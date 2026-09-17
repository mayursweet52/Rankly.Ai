const express = require('express');
const router = express.Router();
const hrmsController = require('../controllers/hrmsController');
const { apiCacheMiddleware } = require('../utils/cacheManager'); // Use existing caching for high traffic

// Fetch static shift mappings (Highly requested, so we cache it for 5 minutes)
router.get('/shifts', apiCacheMiddleware(300), hrmsController.getShifts);

// Timesheet routes
router.get('/timesheets', apiCacheMiddleware(60), hrmsController.getTimesheets);
router.post('/timesheets', hrmsController.submitTimesheet); // No cache on writes

router.post('/attendance/punch', hrmsController.punchAttendance);

module.exports = router;

