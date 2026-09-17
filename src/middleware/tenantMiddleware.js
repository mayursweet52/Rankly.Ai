const prisma = require('../config/database');
const { sendError } = require('../utils/apiResponse');

/**
 * Enterprise Tenant Middleware (Database Routing Layer)
 * This resolves the correct isolated tenant database space for the given request.
 */
async function tenantMiddleware(req, res, next) {
    try {
        // 1. Identify Tenant Code from Header, Query, or Session
        const tenantCode = req.headers['x-tenant-code'] || req.query.tenant || (req.session && req.session.tenantCode);

        // If no explicit tenant code, fallback to the user's mapped organization (if logged in)
        if (!tenantCode) {
            if (req.session && req.session.user && req.session.user.organizationId) {
                req.tenantOrgId = req.session.user.organizationId;
                return next();
            }
            // For public routes (like root login) where tenant isn't established yet
            return next();
        }
// 2. Resolve Tenant Database Space (Organization)
        const organization = await prisma.organization.findUnique({
            where: { tenantCode: tenantCode }
        });
if (!organization) {
            return sendError(res, 404, 'Invalid Company Code. Tenant database space not found.', 'TENANT_NOT_FOUND');
        }

        // --- DEFCON 1 KILL SWITCH (2-HOUR LOCKDOWN) ---
        if (organization.isUnderLockdown && organization.lockdownExpiresAt) {
            const now = new Date();
            if (now < new Date(organization.lockdownExpiresAt)) {
                console.error(?? [DEFCON 1] Request blocked for locked-down domain: );
                return res.status(423).json({
                    success: false,
                    message: ?? SECURITY LOCKDOWN: We detected a severe hacking attempt on this domain. To protect your data, all access has been jammed for 2 hours. Please contact Rankly Support.,
                    code: 'DEFCON_1_ACTIVE'
                });
            } else {
                // Auto-lift lockdown after 2 hours
                await prisma.organization.update({
                    where: { id: organization.id },
                    data: { isUnderLockdown: false, lockdownExpiresAt: null }
                });
            }
        }
        // ----------------------------------------------

        // --- ZERO-TRUST JWT LOCK ---
        // If user is authenticated, ensure their JWT token matches this Tenant Database
        if (req.user && req.user.tenantCode) {
            if (req.user.tenantCode !== organization.tenantCode) {
                console.warn([ZERO-TRUST BLOCK] Cross-Tenant Access Attempt! User  tried to access );
                return sendError(res, 403, '?? Security Alert: Invalid Session Signature. This Database is not connected with your company.', 'ZERO_TRUST_VIOLATION');
            }
        }
        // ---------------------------

        // 3. Bind the Tenant Context to the Request
        // In a true sharded setup, this would be a specific connection string.
        req.tenantOrgId = organization.id;
        if (req.session) {
            req.session.tenantCode = tenantCode;
        }

        next();
    } catch (error) {
        console.error('Tenant Resolution Error:', error);
        return sendError(res, 500, 'Failed to resolve tenant connection.', 'TENANT_ERROR');
    }
}

module.exports = tenantMiddleware;
