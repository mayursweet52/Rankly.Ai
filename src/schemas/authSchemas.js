/**
 * Rankly.ai - Authentication Input Validation Schemas
 */

const registerSchema = {
  email: { type: 'email', required: true, max: 100 },
  password: { type: 'string', required: true, min: 6, max: 128 },
  firstName: { type: 'string', min: 1, max: 50 },
  fname: { type: 'string', min: 1, max: 50 },
  lastName: { type: 'string', min: 0, max: 50 },
  lname: { type: 'string', min: 0, max: 50 },
  username: { type: 'string', min: 1, max: 60 },
  accountType: { type: 'enum', enum: ['normal_user', 'employee', 'admin', 'hr', 'hiring_manager', 'candidate'] },
  isEmployee: { type: 'boolean' },
  role: { type: 'enum', enum: ['normal_user', 'normal', 'employee', 'admin', 'hr', 'hiring_manager', 'reviewer', 'candidate'] },
  phone: { type: 'string', min: 7, max: 25 },
  dob: { type: 'date' },
  age: { type: 'integer', min: 15, max: 120 },
  gender: { type: 'enum', enum: ['Male', 'Female', 'Other', 'male', 'female', 'other'] },
  profession: { type: 'string', max: 100 },
  targetProfession: { type: 'string', max: 100 },
  linkedInUrl: { type: 'string', max: 300 },
  orgName: { type: 'string', max: 120 },
  organizationName: { type: 'string', max: 120 },
  company: { type: 'string', max: 120 },
  referralCode: { type: 'string', min: 4, max: 30 }
};

const loginSchema = {
  identifier: { type: 'string', min: 1, max: 100 },
  email: { type: 'string', min: 1, max: 100 },
  username: { type: 'string', min: 1, max: 100 },
  password: { type: 'string', required: true, min: 1, max: 128 }
};

const sendOtpSchema = {
  email: { type: 'string', min: 3, max: 100 },
  identifier: { type: 'string', min: 3, max: 100 },
  to: { type: 'string', min: 3, max: 100 },
  workEmail: { type: 'string', min: 3, max: 100 },
  corporateEmail: { type: 'string', min: 3, max: 100 },
  isEmployee: { type: 'boolean' },
  type: { type: 'enum', enum: ['email_verification', 'password_reset', 'corporate_email_verification'] }
};

const verifyOtpSchema = {
  email: { type: 'string', min: 3, max: 100 },
  identifier: { type: 'string', min: 3, max: 100 },
  to: { type: 'string', min: 3, max: 100 },
  otp: { type: 'string', required: true, min: 4, max: 12 },
  type: { type: 'string' }
};

const resetPasswordSchema = {
  email: { type: 'email', required: true, max: 100 },
  otp: { type: 'string', required: true, min: 6, max: 6, pattern: /^\d{6}$/, patternMessage: 'OTP code must be exactly 6 digits.' },
  newPassword: { type: 'string', required: true, min: 6, max: 128 }
};

const companyForgotPasswordSchema = {
  email: { type: 'string', min: 1, max: 100 },
  identifier: { type: 'string', min: 1, max: 100 },
  referralCode: { type: 'string', required: true, min: 3, max: 50 }
};

const companyResetPasswordSchema = {
  email: { type: 'string', min: 1, max: 100 },
  identifier: { type: 'string', min: 1, max: 100 },
  referralCode: { type: 'string', required: true, min: 3, max: 50 },
  newPassword: { type: 'string', required: true, min: 6, max: 128 }
};

const verifyReferralSchema = {
  referralCode: { type: 'string', required: true, min: 3, max: 50 },
  email: { type: 'string', min: 1, max: 100 }
};

module.exports = {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  companyForgotPasswordSchema,
  companyResetPasswordSchema,
  verifyReferralSchema
};

