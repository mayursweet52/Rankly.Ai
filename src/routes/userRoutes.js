const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const {
  updateProfileSchema,
  updateEmailSchema,
  updatePasswordSchema,
  inviteTeamMemberSchema,
  createReferralCodeSchema,
  updateMemberStatusSchema
} = require('../schemas/userSchemas');

// All User Routes Require Active Session Authentication
router.use(isAuthenticated);

// User Profile & Security Management
router.get('/profile', userController.getProfile);
router.put('/profile', validate({ body: updateProfileSchema }), userController.updateProfile);
router.put('/email', validate({ body: updateEmailSchema }), userController.updateEmail);
router.put('/password', validate({ body: updatePasswordSchema }), userController.updatePassword);
router.delete('/account', userController.deleteAccount);

// Referral Codes (Admin / HR)
router.post('/referral/create', requireRole(['admin', 'hr']), validate({ body: createReferralCodeSchema }), userController.createReferralCode);
router.get('/referral/list', requireRole(['admin', 'hr']), userController.getReferralCodes);

// Team Management (Enterprise Admin / HR)
router.post('/team/invite', requireRole(['admin', 'hr']), validate({ body: inviteTeamMemberSchema }), userController.inviteTeamMember);
router.get('/team/members', requireRole(['admin', 'hr', 'hiring_manager']), userController.getTeamMembers);
router.post('/team/member-status', requireRole(['admin']), validate({ body: updateMemberStatusSchema }), userController.updateMemberStatus);

module.exports = router;
