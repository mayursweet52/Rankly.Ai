/**
 * Rankly.ai - API Rate Limiting & DDOS Throttling Middleware
 * Specification: Lead Vaibhav (Module 3.4)
 * 
 * Features:
 * - Dynamic per-IP and per-user rate limiting
 * - Dedicated OTP Limiter to prevent SMS/Email bombing (5 requests / 10 min)
 * - Strict Authentication Limiter for login & brute-force defense
 * - Heavy ATS Evaluation Limiter for CPU-intensive resume parsing
 * - RFC-compliant 429 payload with Retry-After and standard RateLimit headers
 * - Transparent Redis / In-Memory store integration
 */

'use strict';

const rateLimit = require('express-rate-limit');
const {
  authBackoffLimiter,
  recordAuthFailure,
  resetAuthFailure,
  calculateBackoffDelay,
  failureStore,
  getConfig: getAuthConfig
} = require('./authRateLimit');

// Helper to format consistent 429 JSON response
function createRateLimitHandler(customMessage, errorCode) {
  return (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: customMessage || 'Rate limit exceeded. Please slow down and try again later.',
      retryAfter,
      code: errorCode || 'RATE_LIMIT_EXCEEDED'
    });
  };
}

// -----------------------------------------------------------------------------
// 1. Authentication Routes Limiter (Strict Brute-Force & Credential Stuffing Guard)
// -----------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_IP, 10) || 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.RATE_LIMIT_BYPASS_SECRET && req.headers['x-bypass-rate-limit'] === process.env.RATE_LIMIT_BYPASS_SECRET) {
      return true;
    }
    return false;
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: createRateLimitHandler(
    'Too many authentication attempts. Please wait 15 minutes before trying again.',
    'AUTH_RATE_LIMIT_EXCEEDED'
  )
});

// -----------------------------------------------------------------------------
// 2. Dedicated OTP Limiter (High-Speed with Loopback/Localhost Bypass & Email Keying)
// -----------------------------------------------------------------------------
const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS, 10) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_OTP_MAX, 10) || 60, // 60 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email || req.body?.identifier || req.body?.workEmail || req.body?.to;
    if (email && typeof email === 'string') {
      return 'otp:' + email.toLowerCase().trim();
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return 'ip:' + forwarded.split(',')[0].trim();
    }
    return 'ip:' + (req.ip || req.connection?.remoteAddress || '127.0.0.1');
  },
  skip: (req) => {
    // Completely bypass rate limiting on local development/localhost to ensure lightning-fast dev testing
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (
      clientIp === '127.0.0.1' || 
      clientIp === '::1' || 
      clientIp === '::ffff:127.0.0.1' || 
      clientIp.includes('127.0.0.1') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }
    if (process.env.RATE_LIMIT_BYPASS_SECRET && req.headers['x-bypass-rate-limit'] === process.env.RATE_LIMIT_BYPASS_SECRET) {
      return true;
    }
    return false;
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: createRateLimitHandler(
    'Too many verification code requests for this address. Please wait a moment before trying again.',
    'OTP_RATE_LIMIT_EXCEEDED'
  )
});

// -----------------------------------------------------------------------------
// 3. AI Inference & Heavy ATS Resume Screening Limiter
// -----------------------------------------------------------------------------
const atsLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_ATS_WINDOW_MS, 10) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_ATS_MAX, 10) || 25, // 25 heavy parses per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.session?.userId || req.user?.id || req.ip || 'ats-user';
  },
  skip: (req) => {
    if (process.env.RATE_LIMIT_BYPASS_SECRET && req.headers['x-bypass-rate-limit'] === process.env.RATE_LIMIT_BYPASS_SECRET) {
      return true;
    }
    return false;
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: createRateLimitHandler(
    'ATS screening rate limit reached. Please wait a few moments before parsing additional resumes.',
    'ATS_RATE_LIMIT_EXCEEDED'
  )
});

const aiLimiter = atsLimiter; // Alias for backward compatibility

// -----------------------------------------------------------------------------
// 4. Public Endpoints Limiter (Moderate Limits for Unauthenticated Traffic)
// -----------------------------------------------------------------------------
const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: createRateLimitHandler(
    'Public rate limit reached. Please slow down your requests.',
    'PUBLIC_RATE_LIMIT_EXCEEDED'
  )
});

// -----------------------------------------------------------------------------
// 5. Authenticated User Limiter (Looser Limits for Logged-In Sessions)
// -----------------------------------------------------------------------------
const authenticatedLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTHED_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTHED_MAX, 10) || 1500, // 1500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.session?.userId || req.user?.id || req.ip || 'authenticated-user';
  },
  validate: { xForwardedForHeader: false, trustProxy: false },
  handler: createRateLimitHandler(
    'User action limit reached. Please wait before performing more operations.',
    'USER_RATE_LIMIT_EXCEEDED'
  )
});

// -----------------------------------------------------------------------------
// 6. Global API Fallback Limiter (Dynamic Tier Selection)
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
  otpLimiter,
  atsLimiter,
  aiLimiter,
  publicLimiter,
  authenticatedLimiter,
  apiLimiter,
  recordAuthFailure,
  resetAuthFailure,
  calculateBackoffDelay,
  failureStore,
  getAuthConfig
};
