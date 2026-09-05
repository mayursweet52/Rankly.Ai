const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth, isAuthenticated, requireHRMS } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { aiLimiter } = require('../middleware/rateLimit');
const { apiCacheMiddleware } = require('../utils/cacheManager');

// Analytics Endpoints (with 15s - 30s TTL fragment caching & ETag support)
router.get('/overview', optionalAuth, apiCacheMiddleware(15000), analyticsController.getOverview);
router.get('/stats', optionalAuth, apiCacheMiddleware(15000), analyticsController.getOverview);
router.get('/distribution', optionalAuth, apiCacheMiddleware(30000), analyticsController.getScoreDistribution);

// AI-Powered Executive Performance & Talent Calibration Reports
router.get('/ai-report', optionalAuth, aiLimiter, analyticsController.generateAiPerformanceReport);
router.post('/ai-report', optionalAuth, aiLimiter, analyticsController.generateAiPerformanceReport);
router.get('/performance-report', optionalAuth, aiLimiter, analyticsController.generateAiPerformanceReport);
router.post('/performance-report', optionalAuth, aiLimiter, analyticsController.generateAiPerformanceReport);

module.exports = router;

