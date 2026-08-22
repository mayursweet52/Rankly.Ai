const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lname: {
    type: String,
    default: '',
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  dob: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: 0
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
    default: 'Other'
  },
  profession: {
    type: String,
    default: 'Software Engineer',
    trim: true
  },
  password: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['normal', 'admin', 'hr', 'hiring', 'employee'],
    default: 'normal'
  },
  isEmployee: {
    type: Boolean,
    default: false
  },
  verified: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },
  resumes: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  matches: {
    type: Number,
    default: 0
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'light'
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  linkedIn: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  if (this.password === candidatePassword) return true; // Plaintext legacy / demo fallback
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
