/**
 * Rankly.ai - Advanced Authentication Rate Limiter
 * Hybrid Per-IP and Per-Account Rate Limiting with Exponential Backoff
 */

// In-memory store for tracking failed attempts: { [key: string]: { attempts: number, lastAttempt: number, blockedUntil: number } }
const failureStore = new Map();

// Helper to safely extract clean client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

// Helper to normalize account identifier from request
function getAccountIdentifier(req, explicitIdentifier = null) {
  if (explicitIdentifier && typeof explicitIdentifier === 'string') {
    return explicitIdentifier.trim().toLowerCase();
  }
  const body = req.body || {};
  const raw = body.email || body.username || body.identifier || body.searchId || body.phone || '';
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

// Read configurable thresholds from environment variables (with solid defaults)
function getConfig() {
  return {
    failThreshold: parseInt(process.env.RATE_LIMIT_AUTH_FAIL_THRESHOLD, 10) || 5, // Consecutive failures before backoff starts
    baseBackoffMs: parseInt(process.env.RATE_LIMIT_AUTH_BASE_BACKOFF_MS, 10) || 2000, // Initial backoff (2 seconds)
    backoffMultiplier: parseFloat(process.env.RATE_LIMIT_AUTH_BACKOFF_MULTIPLIER) || 2.0, // Backoff exponent multiplier
    maxBackoffMs: parseInt(process.env.RATE_LIMIT_AUTH_MAX_BACKOFF_MS, 10) || 15 * 60 * 1000, // Cap at 15 minutes
    resetTimeMs: parseInt(process.env.RATE_LIMIT_AUTH_RESET_TIME_MS, 10) || 15 * 60 * 1000 // Inactivity reset window (15 mins)
  };
}

/**
 * Calculate Exponential Backoff Delay in Milliseconds
 * Delay = min(maxBackoffMs, baseBackoffMs * (backoffMultiplier ^ (attempts - failThreshold)))
 */
function calculateBackoffDelay(attempts, config) {
  if (attempts <= config.failThreshold) {
    return 0;
  }
  const excessAttempts = attempts - config.failThreshold;
  const computedDelay = config.baseBackoffMs * Math.pow(config.backoffMultiplier, excessAttempts - 1);
  return Math.min(config.maxBackoffMs, Math.round(computedDelay));
}

/**
 * Check if a key (IP or Account) is currently restricted
 */
function checkKeyRestriction(key, config) {
  if (!key) return { restricted: false, retryAfterSec: 0, attempts: 0 };
  const record = failureStore.get(key);
  if (!record) return { restricted: false, retryAfterSec: 0, attempts: 0 };

  const now = Date.now();

  // If the record has expired past resetTime, delete it
  if (now - record.lastAttempt > config.resetTimeMs) {
    failureStore.delete(key);
    return { restricted: false, retryAfterSec: 0, attempts: 0 };
  }

  // Check if currently within active backoff window
  if (record.blockedUntil > now) {
    const remainingMs = record.blockedUntil - now;
    const retryAfterSec = Math.ceil(remainingMs / 1000);
    return { restricted: true, retryAfterSec, attempts: record.attempts };
  }

  return { restricted: false, retryAfterSec: 0, attempts: record.attempts };
}

/**
 * Record a failed authentication attempt for both IP and Account
 */
function recordAuthFailure(req, explicitIdentifier = null) {
  const config = getConfig();
  const now = Date.now();
  const ip = getClientIp(req);
  const account = getAccountIdentifier(req, explicitIdentifier);

  const keys = [];
  if (ip) keys.push('ip:' + ip);
  if (account) keys.push('acc:' + account);

  for (const key of keys) {
    let record = failureStore.get(key);
    if (!record || (now - record.lastAttempt > config.resetTimeMs)) {
      record = { attempts: 1, lastAttempt: now, blockedUntil: 0 };
    } else {
      record.attempts += 1;
      record.lastAttempt = now;
    }

    const backoffDelay = calculateBackoffDelay(record.attempts, config);
    if (backoffDelay > 0) {
      record.blockedUntil = now + backoffDelay;
    } else {
      record.blockedUntil = 0;
    }

    failureStore.set(key, record);
  }
}

/**
 * Reset authentication failure count upon successful authentication
 */
function resetAuthFailure(req, explicitIdentifier = null) {
  const ip = getClientIp(req);
  const account = getAccountIdentifier(req, explicitIdentifier);

  if (ip) failureStore.delete('ip:' + ip);
  if (account) failureStore.delete('acc:' + account);
}

/**
 * Middleware: Express Rate Limiter with Exponential Backoff
 */
function authBackoffLimiter(req, res, next) {
  if (process.env.NODE_ENV !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost') {
    return next();
  }
  const config = getConfig();
  const ip = getClientIp(req);
  const account = getAccountIdentifier(req);

  const ipCheck = checkKeyRestriction('ip:' + ip, config);
  const accCheck = account ? checkKeyRestriction('acc:' + account, config) : { restricted: false, retryAfterSec: 0, attempts: 0 };

  if (ipCheck.restricted || accCheck.restricted) {
    const maxRetrySec = Math.max(ipCheck.retryAfterSec || 0, accCheck.retryAfterSec || 0);
    const maxAttempts = Math.max(ipCheck.attempts || 0, accCheck.attempts || 0);

    res.setHeader('Retry-After', maxRetrySec);
    res.setHeader('X-RateLimit-Reset-After', maxRetrySec);

    return res.status(429).json({
      success: false,
      error: `Too many consecutive failed attempts. Exponential backoff active. Please wait ${maxRetrySec}s before retrying.`,
      message: `Too many consecutive failed attempts. Please wait ${maxRetrySec} second${maxRetrySec === 1 ? '' : 's'} before trying again.`,
      retryAfter: maxRetrySec,
      attempts: maxAttempts,
      isExponentialBackoff: true
    });
  }

  next();
}

// Periodic cleanup of stale failure records (every 10 minutes)
setInterval(() => {
  const config = getConfig();
  const now = Date.now();
  for (const [key, record] of failureStore.entries()) {
    if (now - record.lastAttempt > config.resetTimeMs) {
      failureStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

module.exports = {
  authBackoffLimiter,
  recordAuthFailure,
  resetAuthFailure,
  calculateBackoffDelay,
  failureStore,
  getConfig
};
