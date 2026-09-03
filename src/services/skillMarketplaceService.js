/**
 * Anti-Gravity Internal Skill Marketplace Service
 * Implementation for Spec v1.0 (Page 3 & 4)
 */

const prisma = require('../config/database');

/**
 * Format the Skill, EmployeeSkill, and RecommendedTraining into the exact
 * Spec v1.0 Page 4 JSON representation.
 */
function formatSkillBundleToJson(skill, empSkill, training, fallbackEmpCode = null) {
  const empCode = empSkill?.employee?.employeeCode || training?.employee?.employeeCode || fallbackEmpCode || empSkill?.employeeId;
  return {
    skills: skill ? {
      skill_id: skill.skillId,
      name: skill.name,
      category: skill.category
    } : null,
    employee_skills: empSkill ? {
      assignment_id: empSkill.assignmentId,
      employee_id: empCode,
      skill_id: empSkill.skillId,
      proficiency_level: empSkill.proficiencyLevel,
      years_of_experience: empSkill.yearsOfExperience
    } : null,
    recommended_training: training ? {
      recommendation_id: training.recommendationId,
      employee_id: empCode,
      skill_id: training.skillId,
      course_name: training.courseName,
      status: training.status
    } : null
  };
}

/**
 * Register or update a Skill in the catalog
 */
async function registerSkill(skillData) {
  const skillId = skillData.skill_id || skillData.skillId;
  const name = skillData.name;
  const category = skillData.category || 'Engineering';

  return prisma.skill.upsert({
    where: { skillId },
    update: { name, category },
    create: { skillId, name, category }
  });
}

/**
 * Assign a skill to an employee with proficiency & experience
 */
async function assignSkillToEmployee(data) {
  const assignmentId = data.assignment_id || `ESK_${Math.floor(1000 + Math.random() * 9000)}`;
  const empCodeOrId = data.employee_id || data.employeeId;
  const skillId = data.skill_id || data.skillId;
  const proficiencyLevel = data.proficiency_level || 'Advanced';
  const yearsOfExperience = parseFloat(data.years_of_experience || 0);

  // Resolve employee by code or UUID
  let employee = await prisma.employee.findFirst({
    where: {
      OR: [{ employeeCode: empCodeOrId }, { id: empCodeOrId }]
    }
  });

  if (!employee) {
    throw new Error(`Employee '${empCodeOrId}' not found.`);
  }

  // Ensure skill exists
  let skill = await prisma.skill.findUnique({ where: { skillId } });
  if (!skill) {
    skill = await registerSkill({ skill_id: skillId, name: data.skill_name || skillId, category: data.category || 'Engineering' });
  }

  return prisma.employeeSkill.upsert({
    where: {
      employeeId_skillId: {
        employeeId: employee.id,
        skillId: skill.skillId
      }
    },
    update: {
      assignmentId,
      proficiencyLevel,
      yearsOfExperience
    },
    create: {
      assignmentId,
      employeeId: employee.id,
      skillId: skill.skillId,
      proficiencyLevel,
      yearsOfExperience
    },
    include: { employee: true, skill: true }
  });
}

/**
 * Recommend a training course for an employee
 */
async function recommendTraining(data) {
  const recommendationId = data.recommendation_id || `REC_${Math.floor(1000 + Math.random() * 9000)}`;
  const empCodeOrId = data.employee_id || data.employeeId;
  const skillId = data.skill_id || data.skillId;
  const courseName = data.course_name || 'Advanced Upskilling Curriculum';
  const status = data.status || 'In Progress';

  let employee = await prisma.employee.findFirst({
    where: {
      OR: [{ employeeCode: empCodeOrId }, { id: empCodeOrId }]
    }
  });

  if (!employee) {
    throw new Error(`Employee '${empCodeOrId}' not found.`);
  }

  // Ensure skill exists
  let skill = await prisma.skill.findUnique({ where: { skillId } });
  if (!skill) {
    skill = await registerSkill({ skill_id: skillId, name: skillId, category: 'Technical' });
  }

  return prisma.recommendedTraining.upsert({
    where: { recommendationId },
    update: {
      courseName,
      status
    },
    create: {
      recommendationId,
      employeeId: employee.id,
      skillId: skill.skillId,
      courseName,
      status
    },
    include: { employee: true, skill: true }
  });
}

/**
 * Query complete marketplace snapshot for an employee matching Page 4 JSON
 */
async function getEmployeeMarketplaceSnapshot(empCodeOrId) {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ employeeCode: empCodeOrId }, { id: empCodeOrId }]
    },
    include: {
      skills: {
        include: { skill: true }
      },
      trainingRecommendations: {
        include: { skill: true }
      }
    }
  });

  if (!employee) return null;

  const firstEmpSkill = employee.skills[0] || null;
  const skill = firstEmpSkill ? firstEmpSkill.skill : null;
  const firstTraining = employee.trainingRecommendations[0] || null;

  return formatSkillBundleToJson(skill, firstEmpSkill, firstTraining, employee.employeeCode);
}

module.exports = {
  formatSkillBundleToJson,
  registerSkill,
  assignSkillToEmployee,
  recommendTraining,
  getEmployeeMarketplaceSnapshot
};
