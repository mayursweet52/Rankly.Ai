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

module.exports = router;
