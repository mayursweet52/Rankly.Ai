const rateLimit = require('express-rate-limit');
const {
  authBackoffLimiter,
  recordAuthFailure,
  resetAuthFailure,
  calculateBackoffDelay,
  failureStore,
  getConfig: getAuthConfig
} = require('./authRateLimit');

// -----------------------------------------------------------------------------
// 1. Authentication Routes Limiter (Strict Burst Protection)
// -----------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_IP, 10) || 100, // Increased limit
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost',
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    message: 'Too many authentication attempts. Please try again later.'
  }
});

// -----------------------------------------------------------------------------
// 2. Public Endpoints Limiter (Moderate Limits for Unauthenticated / Public Traffic)
// -----------------------------------------------------------------------------
const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 300, // Default: 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    error: 'Public rate limit reached. Please slow down your requests.',
    message: 'Public rate limit reached. Please wait a moment before trying again.'
  }
});

// -----------------------------------------------------------------------------
// 3. Authenticated User Limiter (Looser Limits for Logged-In User Sessions)
// -----------------------------------------------------------------------------
const authenticatedLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTHED_WINDOW_MS, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTHED_MAX, 10) || 1500, // Default: 1500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.session?.userId || req.user?.id || req.ip || 'authenticated-user';
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    error: 'User action limit reached. Please wait before performing more operations.',
    message: 'User action limit reached. Please wait a moment.'
  }
});

// -----------------------------------------------------------------------------
// 4. AI Inference & Resume Screening Limiter (Resource-Heavy Operations)
// -----------------------------------------------------------------------------
const aiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 10) || 1 * 60 * 1000, // Default: 1 minute
  max: parseInt(process.env.RATE_LIMIT_AI_MAX, 10) || 60, // Default: 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.session?.userId || req.user?.id || req.ip || 'ai-user';
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  message: {
    success: false,
    error: 'AI request limit reached. Please wait a moment before sending more requests.',
    message: 'AI request limit reached. Please wait a moment before sending more requests.'
  }
});

// -----------------------------------------------------------------------------
// 5. Global API Fallback Limiter (Dynamic Tier Selection)
// -----------------------------------------------------------------------------
const apiLimiter = (req, res, next) => {
  // If user is authenticated, route to looser authenticated limiter
  if (req.session?.userId || req.user?.id) {
    return authenticatedLimiter(req, res, next);
  }
  // Otherwise apply moderate public limiter
  return publicLimiter(req, res, next);
};

module.exports = {
  authLimiter,
  authBackoffLimiter,
  publicLimiter,
  authenticatedLimiter,
  aiLimiter,
  apiLimiter,
  recordAuthFailure,
  resetAuthFailure,
  calculateBackoffDelay,
  failureStore,
  getAuthConfig
};
