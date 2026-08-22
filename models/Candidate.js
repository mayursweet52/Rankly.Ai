const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  role: {
    type: String,
    default: 'Software Engineer',
    trim: true
  },
  stage: {
    type: String,
    enum: ['screening', 'interview', 'offer', 'hired'],
    default: 'screening'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  skills: [{
    type: String,
    trim: true
  }],
  resumeUrl: {
    type: String,
    default: ''
  },
  rawText: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);
