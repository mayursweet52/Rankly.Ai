const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: [true, 'Identifier (email/phone) is required'],
    trim: true,
    lowercase: true,
    index: true
  },
  otpHash: {
    type: String,
    required: [true, 'OTP hash is required']
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    default: 'email'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes TTL
    expires: 300 // MongoDB TTL index (expires in 300s)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
