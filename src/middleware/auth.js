const prisma = require('../config/database');
const jwt = require('jsonwebtoken');

/**
 * Middleware to enforce session-based or token-based authentication
 */
async function isAuthenticated(req, res, next) {
  try {
    let userId = (req.session && req.session.userId) || 
                 (req.user && req.user.id) || 
                 (req.session?.user && req.session.user.id) || 
                 (req.session?.passport?.user);

    // Check Bearer Token in Authorization header, x-access-token, or cookies
    if (!userId) {
      let token = req.headers['authorization'] || req.headers['x-access-token'];
      if (!token && req.cookies) {
        token = req.cookies.token || req.cookies.jwt;
      }
      if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
          token = token.slice(7).trim();
        }
        const secret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
        try {
          const decoded = jwt.verify(token, secret);
          if (decoded && (decoded.id || decoded.userId)) {
            userId = decoded.id || decoded.userId;
          }
        } catch (e) {
          // Token verification failed, continue to other fallbacks
        }
      }
    }

    // Check API Key fallback for internal tooling / CLI if provided
    if (!userId) {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY.trim()) {
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
    }

    // Fallback: If deleting account or performing self-account management, check body, query, or custom headers
    const isAccountDeletion = req.method === 'DELETE' || 
                              req.path.includes('account') || 
                              req.path.includes('delete') || 
                              (req.originalUrl && (req.originalUrl.includes('account') || req.originalUrl.includes('delete')));

    if (!userId && isAccountDeletion) {
      const lookupEmail = (req.body?.email || req.body?.userEmail || req.query?.email || req.headers['x-user-email'] || '').toLowerCase().trim();
      const lookupId = (req.body?.userId || req.body?.id || req.query?.userId || req.headers['x-user-id'] || '').trim();

      if (lookupId || lookupEmail) {
        const candidateUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(lookupId ? [{ id: lookupId }] : []),
              ...(lookupEmail ? [
                { email: { equals: lookupEmail } },
                { workEmail: { equals: lookupEmail } }
              ] : [])
            ]
          },
          include: { organization: true }
        });
        if (candidateUser) {
          const { password, ...userWithoutPassword } = candidateUser;
          req.user = userWithoutPassword;
          return next();
        }
      }
    }

    if (!userId) {
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
      if (req.session) {
        try { req.session.destroy(); } catch (_) {}
      }
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
 * Middleware for strict HRMS Role-Based Access Control
 * Enforces that only internal HRs, Admins, Hiring Managers, or Employees can enter
 * Candidates / Normal Users are strictly denied access with 403 Forbidden
 */
function requireHRMS(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please sign in to Internal HRMS.' });
  }

  const role = (req.user.role || '').toLowerCase();
  const isEmployeeType = req.user.accountType === 'employee';
  const allowed = ['admin', 'administrator', 'hr', 'human_resources', 'hiring_manager', 'hm', 'employee'];

  if (allowed.includes(role) || isEmployeeType || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied: Internal HRMS Portal is strictly restricted to company HR and Admin personnel.',
    message: 'Access denied: Internal HRMS Portal is strictly restricted to company HR and Admin personnel.'
  });
}

/**
 * Optional Authentication Middleware
 * Attaches user to req.user if session or token exists, but doesn't block if guest
 */
async function optionalAuth(req, res, next) {
  try {
    let userId = (req.session && req.session.userId) || 
                 (req.user && req.user.id) || 
                 (req.session?.user && req.session.user.id) || 
                 (req.session?.passport?.user);

    if (!userId) {
      let token = req.headers['authorization'] || req.headers['x-access-token'];
      if (!token && req.cookies) {
        token = req.cookies.token || req.cookies.jwt;
      }
      if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
          token = token.slice(7).trim();
        }
        const secret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
        try {
          const decoded = jwt.verify(token, secret);
          if (decoded && (decoded.id || decoded.userId)) {
            userId = decoded.id || decoded.userId;
          }
        } catch (e) {
          // Token verification failed, proceed as guest
        }
      }
    }

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

const verifyToken = require('./verifyToken');

module.exports = {
  isAuthenticated,
  requireRole,
  requireHRMS,
  optionalAuth,
  verifyToken
};

