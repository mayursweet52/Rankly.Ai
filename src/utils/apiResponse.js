/**
 * Unified API Response Helpers for Rankly.ai
 * Ensures consistency across all endpoints and prevents frontend undefined access.
 */

function sendSuccess(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
}

function sendError(res, message = 'An error occurred', statusCode = 500, extra = {}) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    message,
    ...extra
  });
}

module.exports = {
  sendSuccess,
  sendError
};
