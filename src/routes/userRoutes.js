const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, requireRole } = require('../middleware/auth');

// All User Routes Require Active Session Authentication
router.use(isAuthenticated);

// User Profile & Security Management
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/email', userController.updateEmail);
router.put('/password', userController.updatePassword);
router.delete('/account', userController.deleteAccount);

// Referral Codes (Admin / HR)
router.post('/referral/create', requireRole(['admin', 'hr']), userController.createReferralCode);
router.get('/referral/list', requireRole(['admin', 'hr']), userController.getReferralCodes);

// Team Management (Enterprise Admin / HR)
router.post('/team/invite', requireRole(['admin', 'hr']), userController.inviteTeamMember);
router.get('/team/members', requireRole(['admin', 'hr', 'hiring_manager']), userController.getTeamMembers);
router.post('/team/member-status', requireRole(['admin']), userController.updateMemberStatus);

module.exports = router;
