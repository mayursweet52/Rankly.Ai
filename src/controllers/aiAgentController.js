/**
 * Anti-Gravity Autonomous AI Agent Controller
 */

const aiAgentService = require('../services/aiAgentService');

async function getAgent(req, res) {
  try {
    const { id } = req.params;
    const agent = await aiAgentService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ success: false, error: `Agent '${id}' not found.` });
    }
    return res.json(agent);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function registerAgent(req, res) {
  try {
    const agent = await aiAgentService.registerOrGetAgent(req.body);
    return res.json(agent);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function chatWithAgent(req, res) {
  try {
    const { id } = req.params;
    const { message, recipient } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    const result = await aiAgentService.dispatchAgentTurn(id, message, recipient);
    return res.json({
      success: true,
      data: result.agent,
      reply: result.latest_reply,
      staged_draft: result.staged_draft
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function approveDraft(req, res) {
  try {
    const { draftId } = req.params;
    const updated = await aiAgentService.approveAndSendDraft(draftId);
    return res.json({
      success: true,
      message: `Draft '${draftId}' approved and dispatched.`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAgent,
  registerAgent,
  chatWithAgent,
  approveDraft
};
