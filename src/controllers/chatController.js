const prisma = require('../config/database');
const { chatCareerCounselor } = require('../services/aiService');

/**
 * Send Message to AI Career Coach & Counselor
 */
async function sendMessage(req, res) {
  try {
    const { message, context = {} } = req.body;
    const userId = req.user?.id || req.session?.userId || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    // Retrieve previous conversation history (last 10 messages)
    let history = [];
    if (userId) {
      history = await prisma.chatMessage.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'asc' }
      });
    }

    // Generate AI response
    const reply = await chatCareerCounselor(message.trim(), history, context);

    // Save Messages if user is logged in
    if (userId) {
      await prisma.chatMessage.create({
        data: {
          userId,
          role: 'user',
          content: message.trim(),
          meta: JSON.stringify(context)
        }
      });

      await prisma.chatMessage.create({
        data: {
          userId,
          role: 'assistant',
          content: reply,
          meta: JSON.stringify(context)
        }
      });
    }

    return res.json({
      success: true,
      message: reply,
      reply
    });
  } catch (error) {
    console.error('Chat Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat message: ' + error.message
    });
  }
}

/**
 * Get User Chat History
 */
async function getChatHistory(req, res) {
  try {
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.json({ success: true, history: [] });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    return res.json({
      success: true,
      history: messages
    });
  } catch (error) {
    console.error('Get Chat History Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat history.' });
  }
}

/**
 * Clear User Chat History
 */
async function clearChatHistory(req, res) {
  try {
    const userId = req.user?.id || req.session?.userId;

    if (userId) {
      await prisma.chatMessage.deleteMany({ where: { userId } });
    }

    return res.json({ success: true, message: 'Chat history cleared.' });
  } catch (error) {
    console.error('Clear Chat History Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear chat history.' });
  }
}

module.exports = {
  sendMessage,
  getChatHistory,
  clearChatHistory
};
