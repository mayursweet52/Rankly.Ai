/**
 * Anti-Gravity Skill Marketplace Controller
 */

const skillMarketplaceService = require('../services/skillMarketplaceService');
const prisma = require('../config/database');

async function listSkills(req, res) {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
    return res.json({ success: true, count: skills.length, data: skills });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function createSkill(req, res) {
  try {
    const skill = await skillMarketplaceService.registerSkill(req.body);
    return res.json({ success: true, data: skill });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function assignSkill(req, res) {
  try {
    const assignment = await skillMarketplaceService.assignSkillToEmployee(req.body);
    return res.json({ success: true, data: assignment });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function recommendTrainingCourse(req, res) {
  try {
    const training = await skillMarketplaceService.recommendTraining(req.body);
    return res.json({ success: true, data: training });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getEmployeeMarketplace(req, res) {
  try {
    const { employeeId } = req.params;
    const snapshot = await skillMarketplaceService.getEmployeeMarketplaceSnapshot(employeeId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: `No skill records for employee '${employeeId}'` });
    }
    return res.json(snapshot);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listSkills,
  createSkill,
  assignSkill,
  recommendTrainingCourse,
  getEmployeeMarketplace
};
