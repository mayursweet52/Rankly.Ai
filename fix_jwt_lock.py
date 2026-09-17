with open('src/middleware/tenantMiddleware.js', 'r', encoding='utf-8') as f:
    content = f.read()

injection = '''
        // 2. Resolve Tenant Database Space (Organization)
        const organization = await prisma.organization.findUnique({
            where: { tenantCode: tenantCode }
        });

        if (!organization) {
            return sendError(res, 404, 'Invalid Company Code. Tenant database space not found.', 'TENANT_NOT_FOUND');
        }

        // --- ZERO-TRUST JWT LOCK ---
        // If user is authenticated, ensure their JWT token matches this Tenant Database
        if (req.user && req.user.tenantCode) {
            if (req.user.tenantCode !== organization.tenantCode) {
                console.warn([ZERO-TRUST BLOCK] Cross-Tenant Access Attempt! User  tried to access );
                return sendError(res, 403, '?? Security Alert: Invalid Session Signature. This Database is not connected with your company.', 'ZERO_TRUST_VIOLATION');
            }
        }
        // ---------------------------'''

content = content.replace('''
        // 2. Resolve Tenant Database Space (Organization)
        const organization = await prisma.organization.findUnique({
            where: { tenantCode: tenantCode }
        });

        if (!organization) {
            return sendError(res, 404, 'Invalid Company Code. Tenant database space not found.', 'TENANT_NOT_FOUND');
        }''', injection.strip())

with open('src/middleware/tenantMiddleware.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added JWT Lock to Tenant Middleware")
