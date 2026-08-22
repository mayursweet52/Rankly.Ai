const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/auth');

// Analytics Endpoints
router.get('/overview', optionalAuth, analyticsController.getOverview);
router.get('/stats', optionalAuth, analyticsController.getOverview);
router.get('/distribution', optionalAuth, analyticsController.getScoreDistribution);

module.exports = router;
