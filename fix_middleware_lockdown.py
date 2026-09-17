with open('src/middleware/tenantMiddleware.js', 'r', encoding='utf-8') as f:
    content = f.read()

injection = '''
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
        // ----------------------------------------------'''

content = content.replace('''
        if (!organization) {
            return sendError(res, 404, 'Invalid Company Code. Tenant database space not found.', 'TENANT_NOT_FOUND');
        }''', injection.strip())

with open('src/middleware/tenantMiddleware.js', 'w', encoding='utf-8') as f:
    f.write(content)
