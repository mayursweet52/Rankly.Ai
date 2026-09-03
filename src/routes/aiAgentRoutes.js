/**
 * Anti-Gravity AI Agent Routes
 */

const express = require('express');
const router = express.Router();
const aiAgentController = require('../controllers/aiAgentController');
const { optionalAuth } = require('../middleware/auth');
const { publicLimiter, aiLimiter } = require('../middleware/rateLimit');

router.post('/', optionalAuth, publicLimiter, aiAgentController.registerAgent);
router.get('/:id', optionalAuth, publicLimiter, aiAgentController.getAgent);
router.post('/:id/chat', optionalAuth, aiLimiter, aiAgentController.chatWithAgent);
router.post('/drafts/:draftId/approve', optionalAuth, publicLimiter, aiAgentController.approveDraft);

module.exports = router;
