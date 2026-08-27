const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const { authLimiter, authBackoffLimiter } = require('../middleware/rateLimit');

// -----------------------------------------------------------------------------
// Public Local Auth Endpoints (Protected by IP + Account Exponential Backoff)
// -----------------------------------------------------------------------------
router.post('/register', authLimiter, authBackoffLimiter, authController.register);
router.post('/candidate/register', authLimiter, authBackoffLimiter, authController.register);
router.post('/login', authLimiter, authBackoffLimiter, authController.login);
router.post('/candidate/login', authLimiter, authBackoffLimiter, authController.login);
router.post('/enterprise/login', authLimiter, authBackoffLimiter, authController.login);

// OTP Verification & Password Recovery
router.post('/send-otp', authLimiter, authBackoffLimiter, authController.sendOtp);
router.post('/forgot-password', authLimiter, authBackoffLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authBackoffLimiter, authController.verifyOtp);
router.post('/reset-password', authLimiter, authBackoffLimiter, authController.resetPassword);

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
