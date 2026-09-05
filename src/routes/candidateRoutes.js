const express = require('express');
const router = express.Router();
const candidateFeatureController = require('../controllers/candidateFeatureController');
const upload = require('../middleware/upload');
const { optionalAuth } = require('../middleware/auth');
const { aiLimiter, apiLimiter } = require('../middleware/rateLimit');

// 1. ATS Score Checker (File or Text + Job Description)
router.post('/ats-check', optionalAuth, aiLimiter, upload.single('resume'), candidateFeatureController.checkAtsScoreHandler);
router.post('/ats-score', optionalAuth, aiLimiter, upload.single('resume'), candidateFeatureController.checkAtsScoreHandler);

// 2. Multi-Format Resume Exporter (Instant PDF & DOCX)
router.post('/export-resume', optionalAuth, apiLimiter, candidateFeatureController.exportResumeHandler);

// 3. AI Cover Letter Generator
router.post('/generate-cover-letter', optionalAuth, aiLimiter, candidateFeatureController.generateCoverLetterHandler);
router.post('/export-cover-letter', optionalAuth, apiLimiter, candidateFeatureController.exportCoverLetterHandler);

// 4. Interactive Skill Gap & Badge Finder
router.get('/skill-gap', optionalAuth, apiLimiter, candidateFeatureController.getSkillGapHandler);
router.post('/skill-gap', optionalAuth, apiLimiter, candidateFeatureController.getSkillGapHandler);

// 5. Candidate Application Tracker
router.get('/applications', optionalAuth, apiLimiter, candidateFeatureController.getApplicationsHandler);
router.post('/applications', optionalAuth, apiLimiter, candidateFeatureController.createApplicationHandler);
router.patch('/applications/:id', optionalAuth, apiLimiter, candidateFeatureController.updateApplicationHandler);
router.put('/applications/:id', optionalAuth, apiLimiter, candidateFeatureController.updateApplicationHandler);
router.delete('/applications/:id', optionalAuth, apiLimiter, candidateFeatureController.deleteApplicationHandler);

// 6. Dedicated Candidate Profile Page
router.get('/profile', optionalAuth, apiLimiter, candidateFeatureController.getCandidateProfileHandler);
router.post('/profile', optionalAuth, apiLimiter, candidateFeatureController.updateCandidateProfileHandler);
router.put('/profile', optionalAuth, apiLimiter, candidateFeatureController.updateCandidateProfileHandler);

// 7. Curated Job Listings Directory & 1-Click Apply
router.get('/jobs', optionalAuth, apiLimiter, candidateFeatureController.getJobListingsHandler);
router.post('/jobs/apply', optionalAuth, apiLimiter, candidateFeatureController.applyToJobHandler);

const pipelineController = require('../controllers/pipelineController');

// 8. Candidate CV Upload & Application Form Submission
router.post('/upload-application', optionalAuth, apiLimiter, upload.single('cv'), candidateFeatureController.uploadApplicationHandler);
router.post('/upload-resume-form', optionalAuth, apiLimiter, upload.single('cv'), candidateFeatureController.uploadApplicationHandler);

// 9. AI-Sorted Candidate Queue & Cheat Sheet Aliases
router.get('/ai-queue', optionalAuth, pipelineController.getAiCandidateQueue);
router.get('/audit-logs', optionalAuth, pipelineController.getCandidateAuditLogs);
router.get('/:id/cheat-sheet', optionalAuth, pipelineController.getCandidateCheatSheet);
router.post('/:id/action', optionalAuth, pipelineController.performCandidateAction);
router.post('/action', optionalAuth, pipelineController.performCandidateAction);

module.exports = router;


