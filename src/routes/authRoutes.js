const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const { authLimiter, authBackoffLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validator');
const {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  companyForgotPasswordSchema,
  companyResetPasswordSchema,
  verifyReferralSchema
} = require('../schemas/authSchemas');

// -----------------------------------------------------------------------------
// Public Local Auth Endpoints (Protected by Rate Limiting + Strict Schema Validation)
// -----------------------------------------------------------------------------
router.post('/register', authLimiter, authBackoffLimiter, validate({ body: registerSchema }), authController.register);
router.post('/candidate/register', authLimiter, authBackoffLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);
router.post('/candidate/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);
router.post('/enterprise/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);

// Candidate / Normal User Password Recovery (Email Existence Check + OTP / Link)
router.post('/send-otp', authLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.sendOtp);
router.post('/forgot-password', authLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.forgotPassword);
router.post('/candidate/forgot-password', authLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.forgotPassword);
router.post('/verify-otp', authLimiter, authBackoffLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post('/reset-password', authLimiter, authBackoffLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/candidate/reset-password', authLimiter, authBackoffLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

// Company Portal / Enterprise Password Recovery (Referral Code Verification Required)
router.post('/company/forgot-password', authLimiter, authBackoffLimiter, validate({ body: companyForgotPasswordSchema }), authController.companyResetPassword);
router.post('/enterprise/forgot-password', authLimiter, authBackoffLimiter, validate({ body: companyForgotPasswordSchema }), authController.companyResetPassword);
router.post('/company/reset-password', authLimiter, authBackoffLimiter, validate({ body: companyResetPasswordSchema }), authController.companyResetPassword);
router.post('/enterprise/reset-password', authLimiter, authBackoffLimiter, validate({ body: companyResetPasswordSchema }), authController.companyResetPassword);
router.post('/company/verify-referral', authLimiter, authBackoffLimiter, validate({ body: verifyReferralSchema }), authController.verifyCompanyReferral);
router.post('/enterprise/verify-referral', authLimiter, authBackoffLimiter, validate({ body: verifyReferralSchema }), authController.verifyCompanyReferral);


// Session State
router.get('/me', authController.getMe);
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// -----------------------------------------------------------------------------
// Google OAuth Endpoints
// -----------------------------------------------------------------------------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      console.error('Google OAuth Authentication Failed:', err || info);
      return res.redirect('/?error=' + encodeURIComponent(err ? err.message : 'Google authentication failed'));
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Session Login Error:', loginErr);
        return res.redirect('/?error=' + encodeURIComponent(loginErr.message));
      }

      req.session.user = {
        id: user.id,
        _id: user.id,
        email: user.email,
        fname: user.firstName,
        lname: user.lastName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role || 'normal_user',
        accountType: user.accountType || 'normal_user'
      };
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.accountType = user.accountType;

      req.session.save(() => {
        const userParam = encodeURIComponent(JSON.stringify(req.session.user));
        return res.redirect(`/?auth=success&user=${userParam}`);
      });
    });
  })(req, res, next);
});

// -----------------------------------------------------------------------------
// Facebook OAuth Endpoints
// -----------------------------------------------------------------------------
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', (req, res, next) => {
  passport.authenticate('facebook', (err, user, info) => {
    if (err || !user) {
      return res.redirect('/?error=' + encodeURIComponent(err ? err.message : 'Facebook authentication failed'));
    }

    req.login(user, (loginErr) => {
      if (loginErr) return res.redirect('/?error=' + encodeURIComponent(loginErr.message));

      req.session.user = {
        id: user.id,
        _id: user.id,
        email: user.email,
        fname: user.firstName,
        lname: user.lastName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role || 'normal_user',
        accountType: user.accountType || 'normal_user'
      };
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.accountType = user.accountType;

      req.session.save(() => {
        const userParam = encodeURIComponent(JSON.stringify(req.session.user));
        return res.redirect(`/?auth=success&user=${userParam}`);
      });
    });
  })(req, res, next);
});

// -----------------------------------------------------------------------------
// Organization Management
// -----------------------------------------------------------------------------
router.post('/create-org', isAuthenticated, authController.createOrganization);
router.post('/enterprise/create-org', isAuthenticated, authController.createOrganization);
router.post('/join-org', isAuthenticated, authController.joinOrganization);
router.post('/enterprise/join-org', isAuthenticated, authController.joinOrganization);

module.exports = router;
