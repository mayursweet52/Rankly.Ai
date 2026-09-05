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

// 1. AI-Sorted Candidate Queue & Audit Logs (Place specific routes BEFORE /:id param routes)
router.get('/ai-queue', optionalAuth, pipelineController.getAiCandidateQueue);
router.get('/audit-logs', optionalAuth, pipelineController.getCandidateAuditLogs);
router.post('/action', optionalAuth, pipelineController.performCandidateAction);

// 2. Pipeline Candidates (Kanban Board)
router.get('/candidates', optionalAuth, pipelineController.getCandidates);
router.post('/candidate', optionalAuth, validate({ body: createCandidateSchema }), pipelineController.createCandidate);
router.get('/candidate/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.getCandidateById);
router.patch('/candidate/:id/stage', optionalAuth, validate({ params: candidateIdParamSchema, body: updateStageBodySchema }), pipelineController.updateCandidateStage);
router.patch('/candidate/:id/notes', optionalAuth, validate({ params: candidateIdParamSchema, body: updateNotesBodySchema }), pipelineController.updateCandidateNotes);
router.post('/candidate/:id/notify', isAuthenticated, validate({ params: candidateIdParamSchema, body: notifyCandidateBodySchema }), pipelineController.notifyCandidate);
router.delete('/candidate/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.deleteCandidate);

// 3. Candidate AI Cheat Sheet & Fast Actions
router.get('/:id/cheat-sheet', optionalAuth, pipelineController.getCandidateCheatSheet);
router.post('/:id/action', optionalAuth, pipelineController.performCandidateAction);

// 4. API_DOCS Spec Aliases
router.get('/', optionalAuth, pipelineController.getCandidates);
router.post('/', optionalAuth, validate({ body: createCandidateSchema }), pipelineController.createCandidate);
router.post('/update', optionalAuth, (req, res, next) => {
  if (req.body && (req.body.id || req.body.candidateId)) {
    req.params.id = req.body.id || req.body.candidateId;
  }
  return pipelineController.updateCandidateStage(req, res, next);
});
router.get('/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.getCandidateById);
router.delete('/:id', optionalAuth, validate({ params: candidateIdParamSchema }), pipelineController.deleteCandidate);

module.exports = router;
