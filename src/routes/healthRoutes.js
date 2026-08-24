const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for diagnostic triggers (max 30 requests per minute)
const healthTriggerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many health diagnostic requests. Please try again later.' }
});

// Public status check
router.get('/', healthController.getPublicStatus);
router.get('/status', healthController.getPublicStatus);

// Diagnostics & Telemetry (Accessible to session users / admin)
router.get('/diagnostics', optionalAuth, healthController.getDiagnostics);
router.post('/run-check', optionalAuth, healthTriggerLimiter, healthController.triggerManualCheck);
router.post('/toggle-autofix', optionalAuth, healthController.toggleAutoFix);
router.get('/logs', optionalAuth, healthController.getLogs);
router.post('/rollback', optionalAuth, healthController.rollbackSnapshot);
router.get('/threats', optionalAuth, healthController.getSecurityThreats);

module.exports = router;
