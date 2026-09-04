const fs = require('fs');
const crypto = require('crypto');

// -----------------------------------------------------------------------------
// 1. Page Cache for Static & SPA HTML Shells
// -----------------------------------------------------------------------------
const pageCache = new Map();

/**
 * Serves an HTML page from memory with ETag and HTTP 304 Not Modified support.
 * Only re-reads from disk if the file's modification time (mtime) changes.
 * 
 * @param {string} filePath - Absolute path to the HTML file
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function serveCachedHtml(filePath, req, res) {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('<h1>404 - Page Not Found</h1>');
    }

    const stat = fs.statSync(filePath);
    let entry = pageCache.get(filePath);

    // Refresh cache if not present or file was modified on disk
    if (!entry || entry.mtimeMs !== stat.mtimeMs) {
      const buffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      const etag = `"${hash}"`;
      entry = {
        buffer,
        etag,
        mtimeMs: stat.mtimeMs,
        size: buffer.length
      };
      pageCache.set(filePath, entry);
    }

    // Set Caching Headers
    res.setHeader('ETag', entry.etag);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    // Check If-None-Match conditional request for instant 304 response
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === entry.etag) {
      return res.status(304).end();
    }

    return res.send(entry.buffer);
  } catch (err) {
    console.error(`[PageCache Error] Failed serving ${filePath}:`, err);
    return res.sendFile(filePath);
  }
}

/**
 * Manually invalidate cached pages
 * @param {string} [filePath] - Specific file to invalidate, or all if null
 */
function invalidatePageCache(filePath = null) {
  if (filePath) {
    pageCache.delete(filePath);
  } else {
    pageCache.clear();
  }
}

// -----------------------------------------------------------------------------
// 2. Fragment / In-Memory API Cache
// -----------------------------------------------------------------------------
const fragmentCache = new Map();

/**
 * Express middleware for caching API fragments with TTL and ETag.
 * Keeps dynamic/personalized data fresh while eliminating redundant DB hits.
 * 
 * @param {number} ttlMs - Time-to-live in milliseconds (default: 15,000 ms)
 * @param {Function} [customKeyGen] - Optional function (req) => string
 */
function apiCacheMiddleware(ttlMs = 15000, customKeyGen = null) {
  return (req, res, next) => {
    // Only cache GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const key = customKeyGen 
      ? customKeyGen(req) 
      : `${req.originalUrl || req.url}:${req.session?.userId || req.user?.id || 'anon'}`;
      
    const now = Date.now();
    const cached = fragmentCache.get(key);

    if (cached && now < cached.expiresAt) {
      // Check ETag
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === cached.etag) {
        return res.status(304).end();
      }

      res.setHeader('ETag', cached.etag);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${Math.max(1, Math.ceil((cached.expiresAt - now) / 1000))}`);
      if (cached.headers) {
        for (const [hName, hVal] of Object.entries(cached.headers)) {
          res.setHeader(hName, hVal);
        }
      }
      return res.status(cached.status || 200).send(cached.body);
    }

    // Intercept res.send to cache response
    const originalSend = res.send.bind(res);
    res.setHeader('X-Cache', 'MISS');

    res.send = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body) {
        try {
          const bodyStr = typeof body === 'string' ? body : (Buffer.isBuffer(body) ? body.toString('utf8') : JSON.stringify(body));
          const hash = crypto.createHash('md5').update(bodyStr).digest('hex');
          const etag = `"${hash}"`;

          res.setHeader('ETag', etag);

          fragmentCache.set(key, {
            body,
            etag,
            status: res.statusCode,
            headers: {
              'Content-Type': res.getHeader('Content-Type') || 'application/json'
            },
            expiresAt: now + ttlMs
          });
        } catch (e) {
          // If body serialization fails, skip caching safely
        }
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Invalidate fragment cache by key or substring prefix
 * @param {string} prefix 
 */
function invalidateFragmentCache(prefix = '') {
  if (!prefix) {
    fragmentCache.clear();
    return;
  }
  for (const key of fragmentCache.keys()) {
    if (key.includes(prefix)) {
      fragmentCache.delete(key);
    }
  }
}

module.exports = {
  serveCachedHtml,
  invalidatePageCache,
  apiCacheMiddleware,
  invalidateFragmentCache,
  pageCache,
  fragmentCache
};
