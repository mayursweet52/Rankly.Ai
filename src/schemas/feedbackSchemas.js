/**
 * Rankly.ai - User Feedback Input Validation Schemas
 */

const createFeedbackSchema = {
  message: { type: 'string', required: true, min: 3, max: 3000 },
  category: { type: 'enum', enum: ['general', 'bug', 'feature', 'ui', 'other', 'suggestion'] },
  rating: { type: 'integer', min: 1, max: 5 },
  email: { type: 'email', max: 100 },
  name: { type: 'string', max: 100 }
};

module.exports = {
  createFeedbackSchema
};
