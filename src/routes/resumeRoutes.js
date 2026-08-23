const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const upload = require('../middleware/upload');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

// Resume Upload & AI Analysis Endpoints
router.post('/detect-role', optionalAuth, aiLimiter, upload.single('resume'), resumeController.detectRoleHandler);
router.post('/screen-resume', optionalAuth, aiLimiter, upload.single('resume'), resumeController.screenResumeHandler);
router.post('/screen', optionalAuth, aiLimiter, upload.single('resume'), resumeController.screenResumeHandler);
router.post('/upload', optionalAuth, aiLimiter, upload.single('resume'), resumeController.screenResumeHandler);
router.post('/batch-upload', optionalAuth, aiLimiter, upload.array('resumes', 20), resumeController.batchUploadHandler);

// Evaluation Records
router.get('/evaluations', optionalAuth, resumeController.getEvaluations);
router.get('/evaluations/:id', optionalAuth, resumeController.getEvaluationById);
router.put('/evaluations/:id/send-to-hr', optionalAuth, resumeController.sendToHR);
router.delete('/evaluations/:id', optionalAuth, resumeController.deleteEvaluation);

module.exports = router;
