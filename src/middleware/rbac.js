const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Role-Based Access Control (RBAC) Middleware for Rankly.ai
 * Restricts endpoint access to specific authorized user roles
 */

function authorizeRoles(...allowedRoles) {
  const roles = allowedRoles.flat().map(r => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    const userRole = (req.user.role || '').toLowerCase();

    if (roles.includes(userRole) || userRole === 'admin' || userRole === 'administrator') {
      return next();
    }

    return res.status(403).json({ success: false, message: `Access denied. Requires roles: ${roles.join(', ')}.` });
  };
}

/**
 * Zoho-Style Granular RBAC Gate (4-Level)
 * @param {string} permissionCode - e.g. "employee:read"
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const userRole = (req.user.role || '').toLowerCase();
    
    // Super Admins bypass everything
    if (userRole === 'admin' || userRole === 'administrator' || userRole === 'super_admin') {
      req.rbac = { dataAccessLevel: 'all_data', formAccess: true, fieldOverrides: null };
      return next();
    }

    try {
      // Find the user's role mapping
      const roleRecord = await prisma.accessRole.findUnique({
        where: { name: userRole },
        include: {
          permissions: {
            where: { permission: { code: permissionCode } },
            include: { permission: true }
          }
        }
      });

      if (!roleRecord || roleRecord.permissions.length === 0) {
        return res.status(403).json({ success: false, error: `Access denied. Missing permission: ${permissionCode}` });
      }

      const rp = roleRecord.permissions[0];
      
      // Inject the 4-level constraints into the request for controllers to use
      req.rbac = {
        dataAccessLevel: rp.dataAccessLevel || 'my_data', // 'none', 'my_data', 'subordinates', 'all_data'
        formAccess: rp.formAccess,
        fieldOverrides: rp.fieldOverrides ? JSON.parse(rp.fieldOverrides) : null
      };

      if (req.rbac.dataAccessLevel === 'none') {
        return res.status(403).json({ success: false, error: `Data access restricted for permission: ${permissionCode}` });
      }

      next();
    } catch (err) {
      console.error('RBAC Error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error validating permissions' });
    }
  };
}

module.exports = {
  authorizeRoles,
  requirePermission
};
