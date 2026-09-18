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
    emergency_contact: {
      name: emp.emergencyContactName || '',
      relation: emp.emergencyContactRelation || '',
      phone: emp.emergencyContactPhone || ''
    },
    reporting_manager_id: emp.reportingManager ? emp.reportingManager.employeeCode : (emp.reportingManagerId || ''),
    bank_account_details: {
      account_number: emp.bankDetails ? emp.bankDetails.accountNumber : '',
      ifsc_code: emp.bankDetails ? emp.bankDetails.ifscCode : '',
      bank_name: emp.bankDetails?.bankName || 'HDFC Bank'
    },
    salary_info: {
      base_pay: emp.salary ? (emp.salary.paymentFrequency === 'Annual' || emp.salary.paymentFrequency === 'annual' ? emp.salary.annualCtc : emp.salary.basicSalary) : 0,
      currency: emp.salary?.currency || 'INR',
      pay_rate: emp.salary ? (emp.salary.paymentFrequency === 'monthly' ? 'Monthly' : 'Annual') : 'Annual'
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
  const baseCode = deptName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'GEN';
  let dept = await prisma.department.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ name: deptName }, { code: baseCode }]
    }
  });
  if (!dept) {
    let finalCode = baseCode;
    const existingWithCode = await prisma.department.findFirst({
      where: { organizationId: orgId, code: finalCode }
    });
    if (existingWithCode) {
      finalCode = `${baseCode}_${Math.floor(10 + Math.random() * 90)}`;
    }
    dept = await prisma.department.create({
      data: { name: deptName, code: finalCode, organizationId: orgId }
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

  // 4. Parse Emergency Contact
  let emergencyContactName = null;
  let emergencyContactRelation = null;
  let emergencyContactPhone = null;
  if (typeof payload.emergency_contact === 'object' && payload.emergency_contact !== null) {
    emergencyContactName = payload.emergency_contact.name || null;
    emergencyContactRelation = payload.emergency_contact.relation || null;
    emergencyContactPhone = payload.emergency_contact.phone || null;
  } else if (typeof payload.emergency_contact === 'string') {
    emergencyContactPhone = payload.emergency_contact;
  }

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
      currentAddress: typeof payload.home_address === 'object' ? JSON.stringify(payload.home_address) : (payload.home_address || null),
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
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
      currentAddress: typeof payload.home_address === 'object' ? JSON.stringify(payload.home_address) : (payload.home_address || null),
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      reportingManagerId,
      dateOfJoining: joiningDate
    }
  });

  // 6. Upsert Bank Account Details
  if (payload.bank_account_details && payload.bank_account_details.account_number) {
    const bankName = payload.bank_account_details.bank_name || 'HDFC Bank';
    await prisma.employeeBankDetails.upsert({
      where: { employeeId: employee.id },
      update: {
        accountNumber: payload.bank_account_details.account_number,
        ifscCode: payload.bank_account_details.ifsc_code || 'N/A',
        accountHolderName: rawName,
        bankName
      },
      create: {
        employeeId: employee.id,
        accountNumber: payload.bank_account_details.account_number,
        ifscCode: payload.bank_account_details.ifsc_code || 'N/A',
        accountHolderName: rawName,
        bankName
      }
    });
  }

  // 7. Upsert Salary Info
  if (payload.salary_info && typeof payload.salary_info.base_pay === 'number') {
    const basePay = payload.salary_info.base_pay;
    const frequency = (payload.salary_info.pay_rate || 'Annual').toLowerCase() === 'annual' ? 'Annual' : 'monthly';
    const currency = payload.salary_info.currency || 'INR';
    const annualCtc = frequency === 'Annual' ? basePay : basePay * 12;

    await prisma.employeeSalary.upsert({
      where: { employeeId: employee.id },
      update: {
        annualCtc,
        basicSalary: frequency === 'Annual' ? Math.round(basePay / 12) : basePay,
        hra: Math.round((basePay / 12) * 0.4),
        netMonthlyPay: Math.round((basePay / 12) * 0.9),
        paymentFrequency: frequency,
        currency
      },
      create: {
        employeeId: employee.id,
        annualCtc,
        basicSalary: frequency === 'Annual' ? Math.round(basePay / 12) : basePay,
        hra: Math.round((basePay / 12) * 0.4),
        netMonthlyPay: Math.round((basePay / 12) * 0.9),
        paymentFrequency: frequency,
        currency
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


  // 9. Auto-Link Identity Provisioning (Zoho-Style)
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create the Team Invitation linked to this Employee ID
    const invite = await prisma.teamInvitation.create({
      data: {
        organizationId: orgId,
        email: employee.workEmail,
        role: 'employee',
        token: token,
        employeeId: employee.id, // The critical link!
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    const emailService = require('./emailService');
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
    
    // Automatically trigger the email to the new employee
    await emailService.sendInvitationEmail(employee.workEmail, org?.name || 'Rankly Enterprise', 'Employee', inviteUrl);
    console.log(`Auto-Link Invitation Sent to ${employee.workEmail}`);
  } catch (inviteErr) {
    console.error('Failed to provision auto-link invitation:', inviteErr);
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
