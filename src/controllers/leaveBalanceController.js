const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get balances for an employee
exports.getEmployeeBalances = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const year = Number(req.query.year) || new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });

    const enriched = balances.map(b => ({
      ...b,
      available: b.totalAllocated + b.carriedForward - b.used - b.pending - b.lapsed - b.encashed,
    }));

    res.json(enriched);
  } catch (err) { res.status(500).json({error: err.message}); }
};

// Get MY balances
exports.getMyBalances = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.id },
    });

    if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: employee.id, year },
      include: { leaveType: true },
    });

    const enriched = balances.map(b => ({
      ...b,
      available: b.totalAllocated + b.carriedForward - b.used - b.pending - b.lapsed - b.encashed,
    }));

    res.json(enriched);
  } catch (err) { res.status(500).json({error: err.message}); }
};

// Manual adjustment
exports.adjustBalance = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const { employeeId, leaveTypeId, amount, reason, year } = req.body;

    if (!employeeId || !leaveTypeId || amount === undefined) {
      return res.status(400).json({ error: 'employeeId, leaveTypeId, amount required' });
    }

    const y = year ? Number(year) : new Date().getFullYear();
    const amt = parseFloat(amount);

    let balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year: y },
      }
    });

    if (balance) {
      balance = await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { totalAllocated: { increment: amt } }
      });
    } else {
      balance = await prisma.leaveBalance.create({
        data: {
          organizationId: orgId,
          employeeId,
          leaveTypeId,
          year: y,
          totalAllocated: amt,
        }
      });
    }

    await prisma.leaveAccrualLog.create({
      data: {
        organizationId: orgId,
        employeeId,
        leaveTypeId,
        amount: amt,
        type: 'MANUAL_ADJUST',
        reason: reason || 'Admin adjustment',
        processedBy: req.user.id,
      },
    });

    res.json(balance);
  } catch (err) { res.status(500).json({error: err.message}); }
};

// Run yearly accrual
exports.runYearlyAccrual = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const year = Number(req.body.year) || new Date().getFullYear();

    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: orgId, isActive: true, accrualType: 'YEARLY', accrualAmount: { gt: 0 } },
    });

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, status: { in: ['ACTIVE', 'PROBATION'] } },
    });

    let count = 0;

    for (const type of leaveTypes) {
      for (const emp of employees) {
        const existing = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: type.id, year },
          },
        });

        if (!existing) {
          await prisma.leaveBalance.create({
            data: {
              organizationId: orgId,
              employeeId: emp.id,
              leaveTypeId: type.id,
              year,
              totalAllocated: type.accrualAmount,
            },
          });
          await prisma.leaveAccrualLog.create({
            data: {
              organizationId: orgId,
              employeeId: emp.id,
              leaveTypeId: type.id,
              amount: type.accrualAmount,
              type: 'ACCRUAL',
              reason: `Yearly accrual for ${year}`,
              processedBy: req.user.id,
            },
          });
          count++;
        }
      }
    }

    res.json({ success: true, processed: count });
  } catch (err) { res.status(500).json({error: err.message}); }
};

// Get accrual history
exports.getAccrualLog = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const employeeId = req.query.employeeId;

    const where = { organizationId: orgId };
    if (employeeId) where.employeeId = employeeId;

    const logs = await prisma.leaveAccrualLog.findMany({
      where,
      orderBy: { processedAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) { res.status(500).json({error: err.message}); }
};
