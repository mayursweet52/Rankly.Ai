const prisma = require('../config/database');

/**
 * Middleware to enforce session-based authentication
 */
async function isAuthenticated(req, res, next) {
  try {
    const userId = req.session && req.session.userId;

    if (!userId) {
      // Check API Key fallback for internal tooling / CLI if provided
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      if (apiKey && apiKey === (process.env.API_KEY || 'rankly-secret-key')) {
        // Find or create default admin for API key usage
        let adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
        if (!adminUser) {
          adminUser = await prisma.user.findFirst();
        }
        if (adminUser) {
          req.user = adminUser;
          return next();
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'User session expired or user no longer exists.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Attach user to request object (strip sensitive password hash)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
}

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param {string[]} allowedRoles - Array of allowed role names (e.g. ['admin', 'hr'])
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (normalizedAllowed.includes(userRole) || userRole === 'admin') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`
    });
  };
}

/**
 * Optional Authentication Middleware
 * Attaches user to req.user if session exists, but doesn't block if guest
 */
async function optionalAuth(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      });
      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }
    }
  } catch (e) {
    // Ignore and proceed as guest
  }
  next();
}

module.exports = {
  isAuthenticated,
  requireRole,
  optionalAuth
};
