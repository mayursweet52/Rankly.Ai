const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validator');
const { sendMessageSchema } = require('../schemas/chatSchemas');

// AI Career Chat Routes
router.post('/message', optionalAuth, aiLimiter, validate({ body: sendMessageSchema }), chatController.sendMessage);
router.post('/', optionalAuth, aiLimiter, validate({ body: sendMessageSchema }), chatController.sendMessage);
router.get('/history', optionalAuth, chatController.getChatHistory);
router.delete('/history', optionalAuth, chatController.clearChatHistory);

module.exports = router;
