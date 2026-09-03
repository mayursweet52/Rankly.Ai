/**
 * Anti-Gravity Employee Service
 * Handles serialization, transformation, and database persistence
 * conforming exactly to the Anti-Gravity Employee JSON schema draft.
 */

const prisma = require('../config/database');

/**
 * Format a Prisma Employee record into the exact Anti-Gravity JSON specification
 */
function formatEmployeeToJson(emp) {
  if (!emp) return null;

  const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ');
  const joiningDateStr = emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '';

  let accessControlLevel = 'Level 1 - Employee';
  if (emp.accessRoles && emp.accessRoles.length > 0) {
    const primaryRole = emp.accessRoles[0].role;
    if (primaryRole) {
      accessControlLevel = primaryRole.displayName || `Level ${primaryRole.level} - ${primaryRole.name}`;
    }
  }

  return {
    employee_id: emp.employeeCode || '',
    full_name: fullName,
    email: emp.workEmail || '',
    role: emp.designation || '',
    department: emp.department ? emp.department.name : '',
    joining_date: joiningDateStr,
    contact_number: emp.phoneNumber || '',
    status: emp.employmentStatus || 'active',
    home_address: emp.currentAddress || '',
    emergency_contact: emp.emergencyContactPhone || emp.emergencyContactName || '',
    reporting_manager_id: emp.reportingManager ? emp.reportingManager.employeeCode : (emp.reportingManagerId || ''),
    bank_account_details: {
      account_number: emp.bankDetails ? emp.bankDetails.accountNumber : '',
      ifsc_code: emp.bankDetails ? emp.bankDetails.ifscCode : ''
    },
    salary_info: {
      base_pay: emp.salary ? emp.salary.basicSalary : 0,
      pay_rate: emp.salary ? emp.salary.paymentFrequency : 'monthly'
    },
    access_control_level: accessControlLevel
  };
}

/**
 * Create or Upsert an Employee from the Anti-Gravity JSON draft
 */
async function saveEmployeeFromJson(payload, explicitOrgId = null) {
  let orgId = explicitOrgId;
  if (!orgId) {
    const firstOrg = await prisma.organization.findFirst();
    if (firstOrg) {
      orgId = firstOrg.id;
    } else {
      const defaultUser = await prisma.user.findFirst();
      const newOrg = await prisma.organization.create({
        data: { name: 'Anti-Gravity Enterprise', adminId: defaultUser ? defaultUser.id : 'system-admin' }
      });
      orgId = newOrg.id;
    }
  }

  // 1. Resolve or Create Department
  const deptName = (payload.department || 'General').trim();
  const deptCode = deptName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
  let dept = await prisma.department.findFirst({
    where: { organizationId: orgId, name: deptName }
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: deptName, code: deptCode, organizationId: orgId }
    });
  }

  // 2. Parse Full Name into First & Last Name
  const rawName = (payload.full_name || 'Employee').trim();
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] || 'Employee';
  const lastName = nameParts.slice(1).join(' ') || '';

  // 3. Resolve Reporting Manager (by employeeCode)
  let reportingManagerId = null;
  if (payload.reporting_manager_id) {
    const mgr = await prisma.employee.findUnique({
      where: { employeeCode: payload.reporting_manager_id.trim() }
    });
    if (mgr) reportingManagerId = mgr.id;
  }

  // 4. Parse Joining Date
  const joiningDate = payload.joining_date ? new Date(payload.joining_date) : new Date();

  // 5. Upsert Employee Core Record
  const empCode = (payload.employee_id || `EMP-${Date.now()}`).trim();
  const employee = await prisma.employee.upsert({
    where: { employeeCode: empCode },
    update: {
      firstName,
      lastName,
      workEmail: (payload.email || `${empCode.toLowerCase()}@antigravity.ai`).trim().toLowerCase(),
      designation: payload.role || 'Staff',
      departmentId: dept.id,
      phoneNumber: payload.contact_number || null,
      employmentStatus: payload.status || 'active',
      currentAddress: payload.home_address || null,
      emergencyContactPhone: payload.emergency_contact || null,
      reportingManagerId,
      dateOfJoining: joiningDate
    },
    create: {
      employeeCode: empCode,
      organizationId: orgId,
      firstName,
      lastName,
      workEmail: (payload.email || `${empCode.toLowerCase()}@antigravity.ai`).trim().toLowerCase(),
      designation: payload.role || 'Staff',
      departmentId: dept.id,
      phoneNumber: payload.contact_number || null,
      employmentStatus: payload.status || 'active',
      currentAddress: payload.home_address || null,
      emergencyContactPhone: payload.emergency_contact || null,
      reportingManagerId,
      dateOfJoining: joiningDate
    }
  });

  // 6. Upsert Bank Account Details
  if (payload.bank_account_details && payload.bank_account_details.account_number) {
    await prisma.employeeBankDetails.upsert({
      where: { employeeId: employee.id },
      update: {
        accountNumber: payload.bank_account_details.account_number,
        ifscCode: payload.bank_account_details.ifsc_code || 'N/A',
        accountHolderName: rawName,
        bankName: 'Primary Bank'
      },
      create: {
        employeeId: employee.id,
        accountNumber: payload.bank_account_details.account_number,
        ifscCode: payload.bank_account_details.ifsc_code || 'N/A',
        accountHolderName: rawName,
        bankName: 'Primary Bank'
      }
    });
  }

  // 7. Upsert Salary Info
  if (payload.salary_info && typeof payload.salary_info.base_pay === 'number') {
    const basePay = payload.salary_info.base_pay;
    const frequency = payload.salary_info.pay_rate || 'monthly';
    const annualCtc = frequency === 'monthly' ? basePay * 12 : basePay;

    await prisma.employeeSalary.upsert({
      where: { employeeId: employee.id },
      update: {
        annualCtc,
        basicSalary: basePay,
        hra: basePay * 0.4,
        netMonthlyPay: basePay * 0.9,
        paymentFrequency: frequency
      },
      create: {
        employeeId: employee.id,
        annualCtc,
        basicSalary: basePay,
        hra: basePay * 0.4,
        netMonthlyPay: basePay * 0.9,
        paymentFrequency: frequency
      }
    });
  }

  // 8. Resolve Access Control Level
  if (payload.access_control_level) {
    const rawLevelStr = payload.access_control_level.toString();
    const levelMatch = rawLevelStr.match(/level\s*(\d+)/i);
    const numLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;
    const cleanRoleName = rawLevelStr.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 32);

    let role = await prisma.accessRole.findFirst({
      where: { level: numLevel }
    });
    if (!role) {
      role = await prisma.accessRole.create({
        data: {
          name: cleanRoleName || `level_${numLevel}`,
          displayName: rawLevelStr,
          level: numLevel
        }
      });
    }

    await prisma.employeeAccessRole.upsert({
      where: {
        employeeId_roleId: {
          employeeId: employee.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        employeeId: employee.id,
        roleId: role.id
      }
    });
  }

  return getEmployeeByCode(employee.employeeCode);
}

/**
 * Retrieve Employee by Code, returning formatted JSON
 */
async function getEmployeeByCode(employeeCode) {
  const emp = await prisma.employee.findUnique({
    where: { employeeCode },
    include: {
      department: true,
      reportingManager: true,
      bankDetails: true,
      salary: true,
      accessRoles: {
        include: { role: true }
      }
    }
  });

  return formatEmployeeToJson(emp);
}

/**
 * List all employees formatted in the Anti-Gravity JSON structure
 */
async function listAllEmployees(orgId = null) {
  const where = orgId ? { organizationId: orgId } : {};
  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      reportingManager: true,
      bankDetails: true,
      salary: true,
      accessRoles: {
        include: { role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return employees.map(formatEmployeeToJson);
}

module.exports = {
  formatEmployeeToJson,
  saveEmployeeFromJson,
  getEmployeeByCode,
  listAllEmployees
};
