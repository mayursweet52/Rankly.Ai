/**
 * Rankly.ai - AI Chat Input Validation Schemas
 */

const sendMessageSchema = {
  message: { type: 'string', required: true, min: 1, max: 4000 },
  history: {
    type: 'array',
    max: 50,
    items: {
      type: 'object',
      schema: {
        role: { type: 'enum', required: true, enum: ['user', 'assistant', 'system'] },
        content: { type: 'string', required: true, max: 8000 }
      }
    }
  }
};

module.exports = {
  sendMessageSchema
};
