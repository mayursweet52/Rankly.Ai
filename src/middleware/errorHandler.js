/**
 * Production-Ready Centralized Error & 404 Handling Middleware
 * Prevents stack trace leakage in production while providing actionable debugging.
 */

function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: [${req.method}] ${req.originalUrl}`,
      statusCode: 404,
      timestamp: new Date().toISOString()
    });
  }
  next();
}

function globalErrorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || 500;
  let clientMessage = err.message || 'Internal Server Error';

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    statusCode = 409;
    clientMessage = 'A record with this unique identifier already exists.';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    clientMessage = 'Requested database record was not found.';
  }

  // Handle Payload Too Large (Multer / BodyParser)
  if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
    statusCode = 413;
    clientMessage = 'Request payload or uploaded file exceeds the allowed size limit.';
  }

  // Log error on server side
  console.error(`🚨 [UNHANDLED ERROR] [${req.method}] ${req.originalUrl}:`, isProd ? err.message : err.stack);

  res.status(statusCode).json({
    success: false,
    error: isProd && statusCode === 500 ? 'An unexpected server error occurred. Please try again later.' : clientMessage,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
