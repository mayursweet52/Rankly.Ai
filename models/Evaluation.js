const mongoose = require('mongoose');

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

module.exports = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);
