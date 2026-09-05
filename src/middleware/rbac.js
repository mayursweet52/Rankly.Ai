/**
 * Role-Based Access Control (RBAC) Middleware for Rankly.ai
 * Restricts endpoint access to specific authorized user roles
 */

function authorizeRoles(...allowedRoles) {
  // Support both authorizeRoles('admin', 'hr') and authorizeRoles(['admin', 'hr'])
  const roles = allowedRoles.flat().map(r => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required.'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();

    // Admin role universally bypasses or matches
    if (roles.includes(userRole) || userRole === 'admin' || userRole === 'administrator') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of the following roles: ${roles.join(', ')}.`
    });
  };
}

module.exports = {
  authorizeRoles
};
