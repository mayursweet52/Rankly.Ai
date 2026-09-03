/**
 * Anti-Gravity Employee Controller
 * Endpoints for creating, fetching, updating, and listing employees
 * using the Anti-Gravity JSON specification.
 */

const employeeService = require('../services/employeeService');
const prisma = require('../config/database');

/**
 * POST /api/employees
 * Accepts the Anti-Gravity JSON payload and persists the employee
 */
async function createOrUpdateEmployee(req, res) {
  try {
    const payload = req.body;
    if (!payload || !payload.employee_id || !payload.full_name || !payload.email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employee_id, full_name, and email are required.'
      });
    }

    const orgId = req.session?.user?.organizationId || req.user?.organizationId || null;
    const result = await employeeService.saveEmployeeFromJson(payload, orgId);

    return res.status(200).json({
      success: true,
      message: 'Employee record processed successfully.',
      data: result
    });
  } catch (err) {
    console.error('Error saving employee:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process employee record: ' + err.message
    });
  }
}

/**
 * GET /api/employees/:id
 * Fetches an employee by ID or employeeCode in the exact Anti-Gravity JSON format
 */
async function getEmployee(req, res) {
  try {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeByCode(id);

    if (!employee) {
      // Also try by UUID if not matched by employeeCode
      const byUuid = await prisma.employee.findUnique({
        where: { id },
        include: {
          department: true,
          reportingManager: true,
          bankDetails: true,
          salary: true,
          accessRoles: { include: { role: true } }
        }
      });
      if (byUuid) {
        return res.json({
          success: true,
          data: employeeService.formatEmployeeToJson(byUuid)
        });
      }

      return res.status(404).json({
        success: false,
        error: `Employee with ID or Code '${id}' not found.`
      });
    }

    return res.json({
      success: true,
      data: employee
    });
  } catch (err) {
    console.error('Error fetching employee:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve employee: ' + err.message
    });
  }
}

/**
 * GET /api/employees
 * Lists all employees in the Anti-Gravity JSON format
 */
async function listEmployees(req, res) {
  try {
    const orgId = req.session?.user?.organizationId || req.user?.organizationId || null;
    const list = await employeeService.listAllEmployees(orgId);

    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    console.error('Error listing employees:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to list employees: ' + err.message
    });
  }
}

/**
 * DELETE /api/employees/:id
 * Removes an employee record
 */
async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }]
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Employee '${id}' not found.`
      });
    }

    await prisma.employee.delete({
      where: { id: existing.id }
    });

    return res.json({
      success: true,
      message: `Employee '${existing.employeeCode}' deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting employee:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete employee: ' + err.message
    });
  }
}

module.exports = {
  createOrUpdateEmployee,
  getEmployee,
  listEmployees,
  getAllEmployees: listEmployees,
  deleteEmployee
};
