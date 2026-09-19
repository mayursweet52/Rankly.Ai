const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupSuperAdmin(userId) {
  try {
    // Check if super admin already exists
    const existing = await prisma.role.findFirst({ where: { isSystem: true } });
    if (existing) {
        // Just make sure user has the role
        const userHasRole = await prisma.userRole.findFirst({ where: { userId, roleId: existing.id }});
        if (!userHasRole) {
            await prisma.userRole.create({
                data: { userId, roleId: existing.id, assignedBy: userId },
            });
            await prisma.user.update({
                where: { id: userId },
                data: { isSuperAdmin: true },
            });
        }
        return;
    }

    const modules = await prisma.module.findMany({ where: { isActive: true } });

    // Create super admin role with ALL permissions
    const superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'System owner with full access',
        isSystem: true,
        createdBy: userId,
        permissions: {
          create: modules.map(m => ({
            formName: m.key,
            dataScope: 'ALL_DATA',
            canView: true, canAdd: true, canEdit: true, canDelete: true,
          })),
        },
      },
    });

    // Assign to first user
    await prisma.userRole.create({
      data: { userId, roleId: superAdminRole.id, assignedBy: userId },
    });

    // Mark user as super admin
    await prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: true },
    });

    console.log('✅ Super Admin created and assigned to user:', userId);
  } catch (err) {
    console.error('Error setting up Super Admin:', err);
  }
}

module.exports = { setupSuperAdmin };
