const mongoose = require('mongoose');

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

module.exports = mongoose.models.ReferralCode || mongoose.model('ReferralCode', ReferralCodeSchema);
