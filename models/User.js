const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  accountType: { type: String, enum: ['normal_user', 'employee'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  
  // Normal User (Job Seeker) Specific
  dob: { type: Date },
  age: { type: Number },
  gender: { type: String },
  profession: { type: String },
  linkedInUrl: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },

  // Enterprise Employee Specific
  role: { type: String, enum: ['admin', 'hr', 'hiring_manager'], default: 'hr' },
  workEmail: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: { type: String, enum: ['active', 'pending_approval'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
