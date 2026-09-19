const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function authorizeRoles(...allowedRoles) {
  const roles = allowedRoles.flat().map(r => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    if (roles.includes(userRole) || req.user.isSuperAdmin) {
      return next();
    }
    return res.status(403).json({ success: false, error: `Access denied. Requires roles: ${roles.join(', ')}.` });
  };
}

/**
 * Zoho-Style Granular RBAC Gate
 * @param {string} formName - e.g. "employee", "role"
 * @param {string} action - "view", "add", "edit", "delete"
 */
function requirePermission(formName, action = 'view') {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    // Super Admins bypass everything
    if (req.user.isSuperAdmin) {
      req.rbac = { dataScope: 'ALL_DATA', formName };
      return next();
    }

    try {
      // Find all roles assigned to this user
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                where: { formName }
              }
            }
          }
        }
      });

      if (userRoles.length === 0) {
        return res.status(403).json({ success: false, error: `Access denied. No roles assigned.` });
      }

      // Check if any assigned role has the required permission for this form and action
      let hasAccess = false;
      let highestScope = 'NO_DATA';
      const scopeOrder = ['NO_DATA', 'MY_DATA', 'SUBORDINATES', 'MY_DATA_AND_SUBORDINATES', 'ALL_DATA'];

      for (const ur of userRoles) {
        for (const p of ur.role.permissions) {
          const actionMap = {
            view: p.canView,
            add: p.canAdd,
            edit: p.canEdit,
            delete: p.canDelete
          };
          if (actionMap[action.toLowerCase()]) {
            hasAccess = true;
            if (scopeOrder.indexOf(p.dataScope) > scopeOrder.indexOf(highestScope)) {
              highestScope = p.dataScope;
            }
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ success: false, error: `Access denied. Missing '${action}' permission for '${formName}'.` });
      }

      // Inject the constraints into the request for controllers to use
      req.rbac = {
        dataScope: highestScope,
        formName
      };

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
