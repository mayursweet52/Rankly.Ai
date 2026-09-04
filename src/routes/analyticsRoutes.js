const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/auth');

const { apiCacheMiddleware } = require('../utils/cacheManager');

// Analytics Endpoints (with 15s - 30s TTL fragment caching & ETag support)
router.get('/overview', optionalAuth, apiCacheMiddleware(15000), analyticsController.getOverview);
router.get('/stats', optionalAuth, apiCacheMiddleware(15000), analyticsController.getOverview);
router.get('/distribution', optionalAuth, apiCacheMiddleware(30000), analyticsController.getScoreDistribution);

module.exports = router;
