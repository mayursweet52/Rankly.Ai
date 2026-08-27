/**
 * Rankly.ai - User, Profile & Team Management Input Validation Schemas
 */

const updateProfileSchema = {
  firstName: { type: 'string', min: 1, max: 50 },
  fname: { type: 'string', min: 1, max: 50 },
  lastName: { type: 'string', min: 0, max: 50 },
  lname: { type: 'string', min: 0, max: 50 },
  phone: { type: 'string', min: 7, max: 25 },
  profession: { type: 'string', max: 100 },
  linkedInUrl: { type: 'string', max: 300 },
  gender: { type: 'enum', enum: ['Male', 'Female', 'Other', 'male', 'female', 'other'] },
  age: { type: 'integer', min: 15, max: 120 },
  dob: { type: 'date' },
  avatarUrl: { type: 'string', max: 500 }
};

const updateEmailSchema = {
  newEmail: { type: 'email', required: true, max: 100 },
  password: { type: 'string', required: true, min: 1, max: 128 }
};

const updatePasswordSchema = {
  currentPassword: { type: 'string', required: true, min: 1, max: 128 },
  newPassword: { type: 'string', required: true, min: 6, max: 128 }
};

const inviteTeamMemberSchema = {
  email: { type: 'email', required: true, max: 100 },
  role: { type: 'enum', required: true, enum: ['admin', 'hr', 'hiring_manager', 'reviewer'] },
  fullName: { type: 'string', min: 1, max: 100 }
};

const createReferralCodeSchema = {
  assignedRole: { type: 'enum', enum: ['admin', 'hr', 'hiring_manager', 'reviewer', 'employee'] },
  maxUses: { type: 'integer', min: 1, max: 10000 },
  expiresInDays: { type: 'integer', min: 1, max: 3650 }
};

const updateMemberStatusSchema = {
  targetUserId: { type: 'id', required: true },
  status: { type: 'enum', required: true, enum: ['active', 'suspended', 'inactive'] }
};

module.exports = {
  updateProfileSchema,
  updateEmailSchema,
  updatePasswordSchema,
  inviteTeamMemberSchema,
  createReferralCodeSchema,
  updateMemberStatusSchema
};
