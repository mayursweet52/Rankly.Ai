const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipelineController');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const {
  createCandidateSchema,
  updateStageBodySchema,
  updateNotesBodySchema,
  notifyCandidateBodySchema,
  candidateIdParamSchema
} = require('../schemas/pipelineSchemas');

// Pipeline Candidates (Kanban Board)
router.get('/candidates', optionalAuth, pipelineController.getCandidates);
router.post('/candidate', optionalAuth, validate({ body: createCandidateSchema }), pipelineController.createCandidate);
router.get('/candidate/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.getCandidateById);
router.patch('/candidate/:id/stage', optionalAuth, validate({ params: candidateIdParamSchema, body: updateStageBodySchema }), pipelineController.updateCandidateStage);
router.patch('/candidate/:id/notes', optionalAuth, validate({ params: candidateIdParamSchema, body: updateNotesBodySchema }), pipelineController.updateCandidateNotes);
router.post('/candidate/:id/notify', isAuthenticated, validate({ params: candidateIdParamSchema, body: notifyCandidateBodySchema }), pipelineController.notifyCandidate);
router.delete('/candidate/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.deleteCandidate);

module.exports = router;
