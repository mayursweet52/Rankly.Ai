const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getLeaveTypes = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const types = await prisma.leaveType.findMany({
      where: { isActive: true, organizationId: orgId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createLeaveType = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const {
      name, code, description, color, icon,
      accrualType, accrualAmount, accrualDay,
      maxConsecutiveDays, minNoticeDays, allowHalfDay, allowNegativeBalance,
      carryForwardEnabled, carryForwardMax, carryForwardExpiry,
      approvalLevels, requireDocument, encashable, sortOrder,
    } = req.body;

    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ error: 'Name and code required' });
    }

    const exists = await prisma.leaveType.findFirst({
      where: {
        organizationId: orgId,
        OR: [{ name: name.trim() }, { code: code.trim().toUpperCase() }]
      },
    });
    if (exists) return res.status(400).json({ error: 'Name or code already exists' });

    const type = await prisma.leaveType.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description, color: color || '#3B82F6', icon,
        accrualType: accrualType || 'YEARLY',
        accrualAmount: parseFloat(accrualAmount) || 0,
        accrualDay: parseInt(accrualDay) || null,
        maxConsecutiveDays: maxConsecutiveDays ? parseInt(maxConsecutiveDays) : null, 
        minNoticeDays: minNoticeDays ? parseInt(minNoticeDays) : 0,
        allowHalfDay: allowHalfDay !== false,
        allowNegativeBalance: allowNegativeBalance || false,
        carryForwardEnabled: carryForwardEnabled || false,
        carryForwardMax: carryForwardMax ? parseFloat(carryForwardMax) : null, 
        carryForwardExpiry: carryForwardExpiry ? parseInt(carryForwardExpiry) : null,
        approvalLevels: approvalLevels ? parseInt(approvalLevels) : 1,
        requireDocument: requireDocument || false,
        encashable: encashable || false,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        createdBy: req.user.id,
      },
    });

    if (type.accrualAmount > 0) {
      await allocateToExistingEmployees(orgId, type.id, type.accrualAmount);
    }

    res.status(201).json(type);
  } catch(err) { res.status(500).json({error: err.message}); }
};

async function allocateToExistingEmployees(orgId, leaveTypeId, amount) {
  const year = new Date().getFullYear();
  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId, status: { in: ['ACTIVE', 'PROBATION'] } },
  });

  for (const emp of employees) {
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: emp.id,
          leaveTypeId,
          year,
        },
      }
    });

    if (existing) {
      await prisma.leaveBalance.update({
        where: { id: existing.id },
        data: { totalAllocated: amount }
      });
    } else {
      await prisma.leaveBalance.create({
        data: {
          organizationId: orgId,
          employeeId: emp.id,
          leaveTypeId,
          year,
          totalAllocated: amount,
        }
      });
    }
  }
}

exports.updateLeaveType = async (req, res) => {
  try {
    const id = req.params.id;
    // ensure int types for parsing from req.body strings
    const updateData = { ...req.body };
    if (updateData.accrualAmount !== undefined) updateData.accrualAmount = parseFloat(updateData.accrualAmount);
    if (updateData.maxConsecutiveDays !== undefined) updateData.maxConsecutiveDays = parseInt(updateData.maxConsecutiveDays);
    if (updateData.minNoticeDays !== undefined) updateData.minNoticeDays = parseInt(updateData.minNoticeDays);
    if (updateData.carryForwardMax !== undefined) updateData.carryForwardMax = parseFloat(updateData.carryForwardMax);

    const type = await prisma.leaveType.update({
      where: { id },
      data: updateData,
    });
    res.json(type);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    await prisma.leaveType.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};
