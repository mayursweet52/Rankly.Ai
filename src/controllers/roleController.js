const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all modules (Admin ko dikhane ke liye)
exports.getModules = async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET all roles (system role ke saath)
exports.getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { fields: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET single role
exports.getRole = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: { include: { fields: true } } },
    });
    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// CREATE role — Admin khud banayega, koi default nahi
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }

    // Check duplicate
    const exists = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (exists) return res.status(400).json({ success: false, error: 'Role name already exists' });

    // Permissions optional — agar diye toh create karo, warna empty
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description || null,
        isSystem: false,
        createdBy: req.user.id,
        permissions: permissions && permissions.length > 0 ? {
          create: permissions.map((p) => ({
            formName: p.formName,
            dataScope: p.dataScope,
            canView: p.canView || false,
            canAdd: p.canAdd || false,
            canEdit: p.canEdit || false,
            canDelete: p.canDelete || false,
            fields: p.fields ? { create: p.fields } : undefined,
          })),
        } : undefined,
      },
      include: { permissions: { include: { fields: true } } },
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE role — Admin permissions change kar sakta hai
exports.updateRole = async (req, res) => {
  try {
    const roleId = req.params.id;
    const { name, description, permissions } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });

    // System role ko koi edit nahi kar sakta (Super Admin)
    if (role.isSystem && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Cannot edit system role' });
    }

    // Delete old permissions
    if (permissions !== undefined) {
      await prisma.permission.deleteMany({ where: { roleId } });
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: name?.trim() || role.name,
        description: description !== undefined ? description : role.description,
        permissions: permissions && permissions.length > 0 ? {
          create: permissions.map((p) => ({
            formName: p.formName,
            dataScope: p.dataScope,
            canView: p.canView || false,
            canAdd: p.canAdd || false,
            canEdit: p.canEdit || false,
            canDelete: p.canDelete || false,
            fields: p.fields ? { create: p.fields } : undefined,
          })),
        } : undefined,
      },
      include: { permissions: { include: { fields: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE role
exports.deleteRole = async (req, res) => {
  try {
    const roleId = req.params.id;
    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ success: false, error: 'Cannot delete system role' });

    // Check if any user has this role
    const userCount = await prisma.userRole.count({ where: { roleId } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${userCount} user(s) still have this role`,
      });
    }

    await prisma.role.delete({ where: { id: roleId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ASSIGN role to user
exports.assignRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    const exists = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (exists) return res.status(400).json({ success: false, error: 'Role already assigned' });

    await prisma.userRole.create({
      data: { userId, roleId, assignedBy: req.user.id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// REMOVE role from user
exports.removeRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET user's roles
exports.getUserRoles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET effective permissions for current user
exports.getMyPermissions = async (req, res) => {
  try {
    const userId = req.user.id;

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });

    // Merge permissions from all roles (widest scope wins)
    const scopeOrder = ['NO_DATA', 'MY_DATA', 'SUBORDINATES', 'MY_DATA_AND_SUBORDINATES', 'ALL_DATA'];
    const merged = {};

    for (const ur of userRoles) {
      for (const p of ur.role.permissions) {
        if (!merged[p.formName]) {
          merged[p.formName] = { ...p };
        } else {
          const existing = merged[p.formName];
          existing.canView = existing.canView || p.canView;
          existing.canAdd = existing.canAdd || p.canAdd;
          existing.canEdit = existing.canEdit || p.canEdit;
          existing.canDelete = existing.canDelete || p.canDelete;
          if (scopeOrder.indexOf(p.dataScope) > scopeOrder.indexOf(existing.dataScope)) {
            existing.dataScope = p.dataScope;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        permissions: Object.values(merged),
        isSuperAdmin: req.user.isSuperAdmin || false,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
