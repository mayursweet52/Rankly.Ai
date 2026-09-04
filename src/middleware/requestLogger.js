/**
 * Production-Ready HTTP Request Logger & Sanitizer
 * Logs method, path, status, latency, and client IP without leaking credentials.
 */

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return {};
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'currentPassword', 'token', 'otp', 'secret', 'apiKey', 'pass'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }
  return sanitized;
}

function requestLogger(req, res, next) {
  const start = Date.now();

  // Skip noisy endpoints and static assets
  const url = req.originalUrl || req.url;
  const isStatic = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i.test(url);
  const isHealth = url.startsWith('/health') || url.startsWith('/api/health');

  if (isStatic || isHealth) {
    return next();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    const logEntry = `${statusColor} [${req.method}] ${url} - ${status} (${duration}ms) - IP: ${clientIp}`;
    
    if (req.method !== 'GET' && Object.keys(req.body || {}).length > 0) {
      const safeBody = sanitizeBody(req.body);
      console.log(`${logEntry} - Body:`, JSON.stringify(safeBody));
    } else {
      console.log(logEntry);
    }
  });

  next();
}

module.exports = { requestLogger, sanitizeBody };
