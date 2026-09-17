const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');

router.get('/templates', onboardingController.getTemplates);
router.post('/templates', onboardingController.createTemplate);

router.get('/active', onboardingController.getActiveOnboardings);
router.post('/assign', onboardingController.assignOnboarding);

router.get('/employee/:employeeId', onboardingController.getEmployeeOnboarding);
router.patch('/tasks/:taskId/status', onboardingController.updateTaskStatus);

module.exports = router;
