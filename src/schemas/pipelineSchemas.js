/**
 * Rankly.ai - Pipeline & Kanban Input Validation Schemas
 */

const createCandidateSchema = {
  candidateName: { type: 'string', required: true, min: 1, max: 100 },
  targetRole: { type: 'string', required: true, min: 1, max: 100 },
  matchScore: { type: 'number', required: true, min: 0, max: 100 },
  fitVerdict: { type: 'string', max: 50 },
  stage: { type: 'enum', enum: ['screening', 'interview', 'offer', 'hired', 'rejected'] },
  email: { type: 'email', max: 100 },
  notes: { type: 'string', max: 5000 },
  keySkills: { type: 'array', items: { type: 'string', max: 60 } },
  missingSkills: { type: 'array', items: { type: 'string', max: 60 } }
};

const updateStageBodySchema = {
  stage: { type: 'enum', required: true, enum: ['screening', 'interview', 'offer', 'hired', 'rejected'] }
};

const updateNotesBodySchema = {
  notes: { type: 'string', required: true, max: 5000 }
};

const notifyCandidateBodySchema = {
  message: { type: 'string', max: 2000 },
  stage: { type: 'enum', enum: ['screening', 'interview', 'offer', 'hired', 'rejected'] }
};

const candidateIdParamSchema = {
  id: { type: 'id', required: true }
};

module.exports = {
  createCandidateSchema,
  updateStageBodySchema,
  updateNotesBodySchema,
  notifyCandidateBodySchema,
  candidateIdParamSchema
};
