/**
 * Anti-Gravity Employee JSON Validation Schemas
 * Directly validates the user's drafted employee payload
 */

const employeeJsonSchema = {
  employee_id: { type: 'string', required: true, min: 2, max: 64 },
  full_name: { type: 'string', required: true, min: 2, max: 128 },
  email: { type: 'string', required: true, format: 'email' },
  role: { type: 'string', required: true, min: 2, max: 128 },
  department: { type: 'string', required: true, min: 2, max: 128 },
  joining_date: { type: 'string', required: true },
  contact_number: { type: 'string', required: false },
  status: { type: 'string', required: false, default: 'active' },
  home_address: { type: 'string', required: false },
  emergency_contact: { type: 'string', required: false },
  reporting_manager_id: { type: 'string', required: false },
  bank_account_details: {
    type: 'object',
    required: false,
    schema: {
      account_number: { type: 'string', required: true },
      ifsc_code: { type: 'string', required: true }
    }
  },
  salary_info: {
    type: 'object',
    required: false,
    schema: {
      base_pay: { type: 'number', required: true },
      pay_rate: { type: 'string', required: false, default: 'monthly' }
    }
  },
  access_control_level: { type: 'string', required: false, default: 'Level 1 - Employee' }
};

module.exports = {
  employeeJsonSchema
};
