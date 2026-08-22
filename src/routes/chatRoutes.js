const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

// AI Career Chat Routes
router.post('/message', optionalAuth, aiLimiter, chatController.sendMessage);
router.post('/', optionalAuth, aiLimiter, chatController.sendMessage);
router.get('/history', optionalAuth, chatController.getChatHistory);
router.delete('/history', optionalAuth, chatController.clearChatHistory);

module.exports = router;
