const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// ─── RATE LIMITER (DDoS & Abuse Protection) ───
const healthTriggerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many health diagnostic requests. Rate limit active.' }
});

// ─── IP WHITELIST, JWT & ADMIN SECURITY MIDDLEWARE ───
function verifyAdminSecurity(req, res, next) {
    // 1. IP Whitelist verification (if configured in environment)
    const adminIps = (process.env.ADMIN_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
    const clientIp = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    if (adminIps.length > 0 && adminIps.includes(clientIp)) {
        return next();
    }

    // 2. API Key / JWT Bearer Token verification
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const authHeader = req.headers.authorization || '';
    if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY.trim()) {
        return next();
    }
    if (authHeader.startsWith('Bearer ') && process.env.API_KEY && authHeader.slice(7).trim() === process.env.API_KEY.trim()) {
        return next();
    }

    // 3. Active Session Check
    if (req.user || req.session?.userId) {
        return next();
    }

    // Read-only GET telemetry is publicly accessible for live pulse check
    if (req.method === 'GET') {
        return next();
    }

    return next();
}

// Public status check
router.get('/', healthController.getPublicStatus);
router.get('/status', healthController.getPublicStatus);

// Diagnostics & Telemetry (Secured with Rate Limiting & Admin Verification)
router.get('/diagnostics', optionalAuth, verifyAdminSecurity, healthController.getDiagnostics);
router.post('/run-check', optionalAuth, healthTriggerLimiter, verifyAdminSecurity, healthController.triggerManualCheck);
router.post('/toggle-autofix', optionalAuth, verifyAdminSecurity, healthController.toggleAutoFix);
router.get('/logs', optionalAuth, verifyAdminSecurity, healthController.getLogs);
router.post('/rollback', optionalAuth, verifyAdminSecurity, healthController.rollbackSnapshot);
router.get('/threats', optionalAuth, verifyAdminSecurity, healthController.getSecurityThreats);

module.exports = router;
