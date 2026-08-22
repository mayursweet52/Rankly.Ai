const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipelineController');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');

// Pipeline Candidates (Kanban Board)
router.get('/candidates', optionalAuth, pipelineController.getCandidates);
router.post('/candidate', optionalAuth, pipelineController.createCandidate);
router.get('/candidate/:id', optionalAuth, pipelineController.getCandidateById);
router.patch('/candidate/:id/stage', optionalAuth, pipelineController.updateCandidateStage);
router.patch('/candidate/:id/notes', optionalAuth, pipelineController.updateCandidateNotes);
router.post('/candidate/:id/notify', isAuthenticated, pipelineController.notifyCandidate);
router.delete('/candidate/:id', optionalAuth, pipelineController.deleteCandidate);

module.exports = router;
