const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateRequestNumber(orgId) {
  const year = new Date().getFullYear();
  const last = await prisma.leaveRequest.findFirst({
    where: { organizationId: orgId, requestNumber: { startsWith: `LR${year}` } },
    orderBy: { createdAt: 'desc' } // we don't have createdAt, let's use appliedAt
  });
  // fallback to id
  const lastReq = await prisma.leaveRequest.findFirst({
    where: { organizationId: orgId, requestNumber: { startsWith: `LR${year}` } },
    orderBy: { appliedAt: 'desc' }
  });

  if (!lastReq) return `LR${year}0001`;
  const match = lastReq.requestNumber.match(new RegExp(`LR${year}(\\d+)`));
  const num = match ? parseInt(match[1]) + 1 : 1;
  return `LR${year}${String(num).padStart(4, '0')}`;
}

async function calculateDays(orgId, fromDate, toDate, isHalfDay, locationId) {
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId: orgId,
      date: { gte: fromDate, lte: toDate },
      isActive: true,
      OR: locationId ? [{ locationId: null }, { locationId }] : [{ locationId: null }],
    },
  });
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

  let workingDays = 0;
  const current = new Date(fromDate);

  while (current <= toDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  if (isHalfDay) workingDays = 0.5;

  const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return { days: totalDays, workingDays };
}

exports.applyLeave = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const {
      employeeId, leaveTypeId,
      fromDate, toDate, isHalfDay, halfDayType,
      reason, contactNumber, contactAddress,
    } = req.body;

    if (!employeeId || !leaveTypeId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employee || employee.organizationId !== orgId) return res.status(404).json({ error: 'Employee not found' });

    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType || !leaveType.isActive || leaveType.organizationId !== orgId) {
      return res.status(400).json({ error: 'Invalid leave type' });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) return res.status(400).json({ error: 'Invalid date range' });

    if (leaveType.minNoticeDays > 0) {
      const noticeDays = Math.floor((from.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (noticeDays < leaveType.minNoticeDays) {
        return res.status(400).json({ error: `Minimum ${leaveType.minNoticeDays} days advance notice required` });
      }
    }

    const { workingDays } = await calculateDays(orgId, from, to, isHalfDay, employee.locationId);

    if (leaveType.maxConsecutiveDays && workingDays > leaveType.maxConsecutiveDays) {
      return res.status(400).json({ error: `Maximum ${leaveType.maxConsecutiveDays} days allowed` });
    }

    const year = from.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    });

    if (balance) {
      const available = balance.totalAllocated + balance.carriedForward
        - balance.used - balance.pending - balance.lapsed - balance.encashed;

      if (!leaveType.allowNegativeBalance && available < workingDays) {
        return res.status(400).json({ error: `Insufficient balance. Available: ${available.toFixed(1)} days, Requested: ${workingDays} days` });
      }
    } else if (!leaveType.allowNegativeBalance) {
      return res.status(400).json({ error: 'No leave balance allocated' });
    }

    const approvers = [];
    if (employee.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: employee.managerId } });
      if (manager && manager.userId) approvers.push(manager.userId);
    }

    if (leaveType.approvalLevels >= 2) {
      const hrUser = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, role: 'admin' },
        include: { user: true }
      });
      if (hrUser && hrUser.user && !approvers.includes(hrUser.userId)) approvers.push(hrUser.userId);
    }

    if (approvers.length === 0) {
      // fallback to org admin
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (org && org.adminId && !approvers.includes(org.adminId)) approvers.push(org.adminId);
    }
    
    if (approvers.length === 0) {
        return res.status(400).json({ error: 'No approver found. Contact HR.' });
    }

    const requestNumber = await generateRequestNumber(orgId);

    const request = await prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        requestNumber,
        employeeId,
        leaveTypeId,
        fromDate: from,
        toDate: to,
        totalDays: workingDays,
        isHalfDay: isHalfDay || false,
        halfDayType,
        reason,
        contactNumber,
        contactAddress,
        totalLevels: approvers.length,
        createdBy: req.user.id,
        approvals: {
          create: approvers.map((approverId, idx) => ({
            organizationId: orgId,
            level: idx + 1,
            approverId,
            status: 'PENDING',
          })),
        },
      },
      include: {
        employee: true,
        leaveType: true,
        approvals: { include: { approver: true } },
      },
    });

    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { increment: workingDays } },
      });
    } else {
      await prisma.leaveBalance.create({
        data: {
          organizationId: orgId,
          employeeId,
          leaveTypeId,
          year,
          totalAllocated: 0,
          pending: workingDays,
        },
      });
    }

    res.status(201).json(request);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const { employeeId, leaveTypeId, status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    let where = { organizationId: orgId };

    if (employeeId) where.employeeId = employeeId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;

    if (fromDate || toDate) {
      where.fromDate = {};
      if (fromDate) where.fromDate.gte = new Date(fromDate);
      if (toDate) where.toDate = {}; // handled below
    }

    const scope = req.rbac?.dataScope || 'NO_DATA';
    const myEmp = await prisma.employee.findUnique({ where: { userId: req.user.id } });

    if (scope === 'MY_DATA') {
      where.employeeId = myEmp?.id || 'NO_ACCESS';
    } else if (scope === 'SUBORDINATES' || scope === 'MY_DATA_AND_SUBORDINATES') {
      const subs = await prisma.employee.findMany({
        where: scope === 'SUBORDINATES'
          ? { managerId: myEmp?.id }
          : { OR: [{ managerId: myEmp?.id }, { id: myEmp?.id }] },
        select: { id: true },
      });
      where.employeeId = { in: subs.map(s => s.id) };
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, profilePicture: true } },
          leaveType: true,
          approvals: { include: { approver: { select: { id: true, email: true } } } },
        },
        orderBy: { appliedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.getMyPendingApprovals = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const approvals = await prisma.leaveApproval.findMany({
      where: {
        organizationId: orgId,
        approverId: req.user.id,
        status: 'PENDING',
        leaveRequest: { status: 'PENDING' },
      },
      include: {
        leaveRequest: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, profilePicture: true } },
            leaveType: true,
            approvals: { include: { approver: { select: { id: true, email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(approvals);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.getLeaveRequest = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const request = await prisma.leaveRequest.findUnique({
      where: { id: req.params.id },
      include: {
        employee: true,
        leaveType: true,
        approvals: { include: { approver: { select: { id: true, email: true } } } },
        documents: true,
      },
    });
    if (!request || request.organizationId !== orgId) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.approveLeave = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const id = req.params.id;
    const { comment } = req.body;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: { orderBy: { level: 'asc' } }, leaveType: true },
    });

    if (!request || request.organizationId !== orgId) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    const currentApproval = request.approvals.find(
      a => a.level === request.currentLevel && a.approverId === req.user.id && a.status === 'PENDING'
    );

    if (!currentApproval) return res.status(403).json({ error: 'You are not the approver for this level' });

    await prisma.leaveApproval.update({
      where: { id: currentApproval.id },
      data: { status: 'APPROVED', comment, actionAt: new Date() },
    });

    if (request.currentLevel < request.totalLevels) {
      await prisma.leaveRequest.update({
        where: { id },
        data: { currentLevel: request.currentLevel + 1 },
      });
      return res.json({ success: true, message: 'Approved. Forwarded to next level.' });
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    const year = request.fromDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });

    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: { decrement: request.totalDays },
          used: { increment: request.totalDays },
        },
      });
    }

    res.json({ success: true, message: 'Leave approved' });
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.rejectLeave = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const id = req.params.id;
    const { comment } = req.body;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: true },
    });
    if (!request || request.organizationId !== orgId) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    const currentApproval = request.approvals.find(
      a => a.level === request.currentLevel && a.approverId === req.user.id && a.status === 'PENDING'
    );
    if (!currentApproval) return res.status(403).json({ error: 'Not your turn' });

    await prisma.leaveApproval.update({
      where: { id: currentApproval.id },
      data: { status: 'REJECTED', comment, actionAt: new Date() },
    });

    await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    const year = request.fromDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });
    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { decrement: request.totalDays } },
      });
    }

    res.json({ success: true, message: 'Leave rejected' });
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.cancelLeave = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const id = req.params.id;
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request || request.organizationId !== orgId) return res.status(404).json({ error: 'Not found' });

    const myEmp = await prisma.employee.findUnique({ where: { userId: req.user.id } });
    if (request.employeeId !== myEmp?.id) return res.status(403).json({ error: 'Not your request' });

    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Cannot cancel. Already processed.' });

    await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    const year = request.fromDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });
    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { decrement: request.totalDays } },
      });
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.getTeamCalendar = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const { fromDate, toDate, departmentId } = req.query;

    const from = fromDate ? new Date(fromDate) : new Date();
    const to = toDate ? new Date(toDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const where = {
      organizationId: orgId,
      status: 'APPROVED',
      fromDate: { lte: to },
      toDate: { gte: from },
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, profilePicture: true, departmentId: true } },
        leaveType: { select: { name: true, color: true, code: true } },
      },
      orderBy: { fromDate: 'asc' },
    });

    res.json(requests);
  } catch (err) { res.status(500).json({error: err.message}); }
};
