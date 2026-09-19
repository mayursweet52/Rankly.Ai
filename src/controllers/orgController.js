const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============ DEPARTMENTS ============
exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true, organizationId: req.session.organizationId || req.user.organizationId },
      include: { parent: true, _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const dept = await prisma.department.create({
      data: { name: name.trim(), code, description, parentId, organizationId: req.session.organizationId || req.user.organizationId },
    });
    res.status(201).json(dept);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateDepartment = async (req, res) => {
  try {
    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(dept);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const empCount = await prisma.employee.count({ where: { departmentId: req.params.id } });
    if (empCount > 0) return res.status(400).json({ error: `${empCount} employees in this department` });

    await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};

// ============ DESIGNATIONS ============
exports.getDesignations = async (req, res) => {
  try {
    const list = await prisma.designation.findMany({
      where: { isActive: true, organizationId: req.session.organizationId || req.user.organizationId },
      orderBy: { level: 'desc' },
    });
    res.json(list);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createDesignation = async (req, res) => {
  try {
    const { name, level, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const d = await prisma.designation.create({
      data: { name: name.trim(), level: Number(level)||1, description, organizationId: req.session.organizationId || req.user.organizationId },
    });
    res.status(201).json(d);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateDesignation = async (req, res) => {
  try {
    const d = await prisma.designation.update({ where: { id: req.params.id }, data: req.body });
    res.json(d);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const empCount = await prisma.employee.count({ where: { designationId: req.params.id } });
    if (empCount > 0) return res.status(400).json({ error: `${empCount} employees with this designation` });
    await prisma.designation.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};

// ============ LOCATIONS ============
exports.getLocations = async (req, res) => {
  try {
    const list = await prisma.location.findMany({
      where: { isActive: true, organizationId: req.session.organizationId || req.user.organizationId },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createLocation = async (req, res) => {
  try {
    const { name, address, city, state, country, pincode, timezone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const loc = await prisma.location.create({
      data: { name: name.trim(), address, city, state, country, pincode, timezone, organizationId: req.session.organizationId || req.user.organizationId },
    });
    res.status(201).json(loc);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateLocation = async (req, res) => {
  try {
    const loc = await prisma.location.update({ where: { id: req.params.id }, data: req.body });
    res.json(loc);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteLocation = async (req, res) => {
  try {
    await prisma.location.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};
