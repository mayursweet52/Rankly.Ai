const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { applyDataScope } = require('../utils/dataScope');

async function generateEmployeeCode(orgId) {
  const last = await prisma.employee.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: { employeeCode: true },
  });
  if (!last) return 'EMP0001';
  const match = last.employeeCode.match(/EMP(\d+)/);
  const num = match ? parseInt(match[1]) + 1 : 1;
  return `EMP${String(num).padStart(4, '0')}`;
}

exports.getEmployees = async (req, res) => {
  try {
    const { search, departmentId, designationId, locationId, status, page = 1, limit = 20 } = req.query;
    const orgId = req.session.organizationId || req.user.organizationId;
    
    let where = { organizationId: orgId };

    if (search) {
      where.OR = [
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
        { email: { contains: String(search) } },
        { employeeCode: { contains: String(search) } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (designationId) where.designationId = designationId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    where = applyDataScope(req, where, 'id', 'userId');

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          customFieldValues: { include: { customField: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch(err) { res.status(500).json({success: false, error: err.message}); }
};

exports.getEmployee = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        designation: true,
        location: true,
        documents: { include: { documentType: true } },
        customFieldValues: { include: { customField: true } },
      },
    });

    if (!employee || employee.organizationId !== orgId) return res.status(404).json({ error: 'Employee not found' });

    const scope = req.rbac?.dataScope;
    if (scope === 'MY_DATA' && employee.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (scope === 'SUBORDINATES') {
      const emp = await prisma.employee.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      if (employee.managerId !== emp?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(employee);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createEmployee = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const {
      firstName, lastName, email, personalEmail, phone, alternatePhone,
      dateOfBirth, gender, maritalStatus, bloodGroup,
      departmentId, designationId, locationId, managerId,
      joiningDate, confirmationDate, employmentType, workMode,
      profilePicture, customFields,
    } = req.body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'firstName, lastName, email required' });
    }

    const exists = await prisma.employee.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const customFieldDefs = await prisma.customField.findMany({ where: { isActive: true, organizationId: orgId } });
    for (const field of customFieldDefs) {
      if (field.isRequired && (!customFields || !customFields[field.key])) {
        return res.status(400).json({ error: `${field.label} is required` });
      }
    }

    const employeeCode = await generateEmployeeCode(orgId);

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        personalEmail, phone, alternatePhone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender, maritalStatus, bloodGroup,
        departmentId: departmentId || null,
        designationId: designationId || null,
        locationId: locationId || null,
        managerId: managerId || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
        employmentType, workMode,
        profilePicture,
        createdBy: req.user.id,
        organizationId: orgId,
        customFields: customFields ? JSON.stringify(customFields) : "{}",
        customFieldValues: customFields ? {
          create: customFieldDefs
            .filter(f => customFields[f.key] !== undefined)
            .map(f => ({
              customFieldId: f.id,
              value: String(customFields[f.key]),
            })),
        } : undefined,
      },
      include: {
        department: true,
        designation: true,
        location: true,
        customFieldValues: { include: { customField: true } },
      },
    });

    res.status(201).json(employee);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const orgId = req.session.organizationId || req.user.organizationId;
    const data = req.body;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.organizationId !== orgId) return res.status(404).json({ error: 'Employee not found' });

    if (data.customFields) {
      const customFieldDefs = await prisma.customField.findMany({ where: { isActive: true, organizationId: orgId } });
      for (const field of customFieldDefs) {
        if (data.customFields[field.key] !== undefined) {
          const valStr = String(data.customFields[field.key]);
          
          // Custom approach since employeeCustomFieldValue has no unique aside from the composite
          const existing = await prisma.employeeCustomFieldValue.findUnique({
            where: { employeeId_customFieldId: { employeeId: id, customFieldId: field.id } }
          });
          if (existing) {
            await prisma.employeeCustomFieldValue.update({
              where: { id: existing.id },
              data: { value: valStr }
            });
          } else {
            await prisma.employeeCustomFieldValue.create({
              data: { employeeId: id, customFieldId: field.id, value: valStr }
            });
          }
        }
      }
    }

    const updateData = { updatedBy: req.user.id };
    const allowedFields = [
      'firstName', 'lastName', 'email', 'personalEmail', 'phone', 'alternatePhone',
      'gender', 'maritalStatus', 'bloodGroup',
      'departmentId', 'designationId', 'locationId', 'managerId',
      'employmentType', 'workMode', 'status', 'profilePicture',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.joiningDate) updateData.joiningDate = new Date(data.joiningDate);
    if (data.confirmationDate) updateData.confirmationDate = new Date(data.confirmationDate);
    if (data.customFields) updateData.customFields = JSON.stringify(data.customFields);

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true, designation: true, location: true,
        customFieldValues: { include: { customField: true } },
      },
    });

    res.json(updated);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const orgId = req.session.organizationId || req.user.organizationId;
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp || emp.organizationId !== orgId) return res.status(404).json({ error: 'Employee not found' });

    await prisma.employee.update({
      where: { id },
      data: { status: 'TERMINATED', updatedBy: req.user.id },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.getEmployeeStats = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const [total, active, probation, resigned, byDept, byLocation] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId } }),
      prisma.employee.count({ where: { status: 'ACTIVE', organizationId: orgId } }),
      prisma.employee.count({ where: { status: 'PROBATION', organizationId: orgId } }),
      prisma.employee.count({ where: { status: 'RESIGNED', organizationId: orgId } }),
      prisma.employee.groupBy({ by: ['departmentId'], where: { organizationId: orgId }, _count: { id: true } }),
      prisma.employee.groupBy({ by: ['locationId'], where: { organizationId: orgId }, _count: { id: true } }),
    ]);

    res.json({ success: true, data: { total, active, probation, resigned, byDept, byLocation } });
  } catch(err) { res.status(500).json({error: err.message}); }
};
