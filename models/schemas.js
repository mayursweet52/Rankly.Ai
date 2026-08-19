const mongoose = require('mongoose');

// User Schema (Dual-Track)
const UserSchema = new mongoose.Schema({
  accountType: { type: String, enum: ['normal_user', 'employee'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  
  // Normal User Specific
  dob: { type: Date },
  age: { type: Number },
  gender: { type: String },
  profession: { type: String },
  linkedInUrl: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },

  // Employee Specific
  role: { type: String, enum: ['admin', 'hr', 'hiring_manager'], default: 'hr' },
  workEmail: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: { type: String, enum: ['active', 'pending_approval'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// Organization Schema
const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Admin Referral Code Schema
const ReferralCodeSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  assignedRole: { type: String, enum: ['hr', 'hiring_manager'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  isUsed: { type: Boolean, default: false }
});

// Candidate Evaluation Schema
const EvaluationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  isPractice: { type: Boolean, default: false },
  candidateName: String,
  candidateEmail: String,
  targetRole: { type: String, required: true },
  extractedText: String,
  matchScore: Number,
  scoreBreakdown: {
    skills: Number,
    experience: Number,
    tools: Number,
    education: Number
  },
  fitVerdict: String,
  analysis: {
    summary: String,
    matchedSkills: [String],
    missingSkills: [String],
    recommendations: [String]
  },
  pipelineStage: { 
    type: String, 
    enum: ['applied', 'ai_screened', 'hm_review', 'interview', 'offered', 'rejected'], 
    default: 'ai_screened' 
  },
  status: { 
    type: String, 
    enum: ['submitted', 'screened', 'sent_to_hr', 'shortlisted', 'rejected'], 
    default: 'screened' 
  },
  hmNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
const ReferralCode = mongoose.models.ReferralCode || mongoose.model('ReferralCode', ReferralCodeSchema);
const Evaluation = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);

module.exports = {
  User,
  Organization,
  ReferralCode,
  Referral: ReferralCode, // Backward compatibility alias
  Evaluation
};
