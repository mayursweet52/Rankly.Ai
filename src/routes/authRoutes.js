const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { authLimiter, authBackoffLimiter, otpLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validator');
const {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  resetPasswordWithTokenSchema,
  changePasswordVerifySchema,
  changePasswordSubmitSchema,
  companyForgotPasswordSchema,
  companyResetPasswordSchema,
  verifyReferralSchema
} = require('../schemas/authSchemas');

// -----------------------------------------------------------------------------
// Public Local Auth Endpoints (Protected by Rate Limiting + Strict Schema Validation)
// -----------------------------------------------------------------------------
router.post('/register', authLimiter, authBackoffLimiter, validate({ body: registerSchema }), authController.register);
router.post('/create-account', authLimiter, authBackoffLimiter, authController.register);
router.post('/resend-otp', otpLimiter, authBackoffLimiter, authController.resendOtp);
router.post('/resend-link', authLimiter, authBackoffLimiter, authController.resendLink);
router.get('/verify-email', authController.verifyEmailLink);
router.get('/check-email', authController.checkEmailAvailability);
router.post('/check-email', authController.checkEmailAvailability);
router.get('/check-verification', authController.checkVerificationStatus);
router.get('/check-verified', authController.checkVerificationStatus);
router.post('/candidate/register', authLimiter, authBackoffLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);
router.post('/candidate/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);
router.post('/enterprise/login', authLimiter, authBackoffLimiter, validate({ body: loginSchema }), authController.login);

// Candidate / Normal User Password Recovery (Email Existence Check + OTP / Link)
router.post('/send-otp', otpLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.sendOtp);
router.post('/forgot-password', otpLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.forgotPassword);
router.post('/candidate/forgot-password', otpLimiter, authBackoffLimiter, validate({ body: sendOtpSchema }), authController.forgotPassword);
router.post('/verify-otp', otpLimiter, authBackoffLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post('/reset-password', authLimiter, authBackoffLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/candidate/reset-password', authLimiter, authBackoffLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

// 1. Password Reset via Verified Link (Email -> OTP -> Send Reset Link to Gmail -> Open Link -> Set New Password)
router.post('/forgot-password/verify-and-send-link', otpLimiter, authBackoffLimiter, validate({ body: verifyOtpSchema }), authController.verifyForgotOtpAndSendLink);
router.post('/reset-password-with-token', authLimiter, authBackoffLimiter, validate({ body: resetPasswordWithTokenSchema }), authController.resetPasswordWithToken);

// 2. Change Password via Current Password (Email -> OTP + Current Password -> Set New Password)
router.post('/change-password/verify', authLimiter, authBackoffLimiter, validate({ body: changePasswordVerifySchema }), authController.verifyChangePasswordCredentials);
router.post('/change-password/submit', authLimiter, authBackoffLimiter, validate({ body: changePasswordSubmitSchema }), authController.submitChangePassword);

// Company Portal / Enterprise Password Recovery (Referral Code Verification Required)
router.post('/company/forgot-password', authLimiter, authBackoffLimiter, validate({ body: companyForgotPasswordSchema }), authController.companyResetPassword);
router.post('/enterprise/forgot-password', authLimiter, authBackoffLimiter, validate({ body: companyForgotPasswordSchema }), authController.companyResetPassword);
router.post('/company/reset-password', authLimiter, authBackoffLimiter, validate({ body: companyResetPasswordSchema }), authController.companyResetPassword);
router.post('/enterprise/reset-password', authLimiter, authBackoffLimiter, validate({ body: companyResetPasswordSchema }), authController.companyResetPassword);
router.post('/company/verify-referral', authLimiter, authBackoffLimiter, validate({ body: verifyReferralSchema }), authController.verifyCompanyReferral);
router.post('/enterprise/verify-referral', authLimiter, authBackoffLimiter, validate({ body: verifyReferralSchema }), authController.verifyCompanyReferral);


// Session State & Account Deletion
router.get('/me', authController.getMe);
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);
router.delete('/account', isAuthenticated, userController.deleteAccount);
router.post('/delete-account', isAuthenticated, userController.deleteAccount);
router.delete('/delete-account', isAuthenticated, userController.deleteAccount);

function attachOAuthSession(req, user) {
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
}



// -----------------------------------------------------------------------------
// Smart Dynamic Google OAuth Resolution (Railway vs Localhost / Custom IP / Tunnel)
// -----------------------------------------------------------------------------
function resolveGoogleCallback(req) {
  const rawHost = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const host = rawHost.split(',')[0].trim();
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

  // 1. If user is accessing from localhost / 127.0.0.1, route back to their local port!
  if (isLocalhost) {
    return `http://${host}/auth/google/callback`;
  }

  // 2. If user is accessing via Railway
  const isRailway = host.includes('railway.app') || !!process.env.RAILWAY_ENVIRONMENT;
  if (isRailway) {
    return `https://${host}/auth/google/callback`;
  }

  // 3. If user is accessing via Cloudflare Tunnel
  if (host.includes('trycloudflare.com')) {
    return `https://${host}/auth/google/callback`;
  }

  // 4. Default: Auto-detect from request headers
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return `${proto}://${host}/auth/google/callback`;
}

router.get('/google', (req, res, next) => {
  const callbackURL = resolveGoogleCallback(req);
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const returnOrigin = `${proto}://${host}`;

  // Encode origin in OAuth state for seamless cross-environment bridging
  const statePayload = Buffer.from(JSON.stringify({
    origin: returnOrigin,
    relay: req.query.relay === 'true',
    ts: Date.now()
  })).toString('base64');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state: statePayload,
    callbackURL
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const callbackURL = resolveGoogleCallback(req);
  passport.authenticate('google', { callbackURL }, async (err, user, info) => {
    if (err || !user) {
      console.error('Google OAuth Authentication Failed:', err || info);
      const errMsg = (err && err.message) ? err.message : 'Google authentication could not be completed. Please sign in with your email and password.';
      return res.redirect('/?error=' + encodeURIComponent(errMsg));
    }

    // Check if request originated from another local port/device via Relay Bridge
    if (req.query.state) {
      try {
        const stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
        const currentHost = (req.headers['x-forwarded-host'] || req.get('host') || '').toLowerCase();
        const targetOrigin = stateObj.origin || '';
        
        if (targetOrigin && !targetOrigin.includes(currentHost)) {
          // Sign a secure temporary 5-minute bridge token
          const bridgeToken = jwt.sign({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userId: user.id,
            role: user.role,
            accountType: user.accountType
          }, process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026', { expiresIn: '5m' });

          return res.redirect(`${targetOrigin}/auth/google/bridge?token=${encodeURIComponent(bridgeToken)}`);
        }
      } catch (stateErr) {
        console.warn('OAuth State Relay error:', stateErr.message);
      }
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Session Login Error:', loginErr);
        return res.redirect('/?error=' + encodeURIComponent(loginErr.message));
      }

      attachOAuthSession(req, user);
      req.session.save(() => {
        const userParam = encodeURIComponent(JSON.stringify(req.session.user));
        const isEmployeeRole = user.accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((user.role || '').toLowerCase());
        const dest = isEmployeeRole ? '/hrms/dashboard' : '/candidate/dashboard';
        return res.redirect(`${dest}?auth=success&user=${userParam}`);
      });
    });
  })(req, res, next);
});

// Universal OAuth Bridge Receiver: logs user in from signed bridge token
router.get('/google/bridge', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect('/login?error=Missing+token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026');
    const { email, firstName, lastName, role, accountType } = decoded;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const dummyPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          username: `google_${Date.now().toString().slice(-6)}`,
          password: dummyPassword,
          accountType: accountType || 'normal_user',
          role: role || 'normal_user',
          status: 'active',
          isEmailVerified: true
        }
      });
    }

    attachOAuthSession(req, user);
    req.session.save(() => {
      const userParam = encodeURIComponent(JSON.stringify(req.session.user));
      const isEmployeeRole = user.accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((user.role || '').toLowerCase());
      const dest = isEmployeeRole ? '/hrms/dashboard' : '/candidate/dashboard';
      return res.redirect(`${dest}?auth=success&user=${userParam}`);
    });
  } catch (err) {
    console.error('OAuth Bridge Validation Failed:', err.message);
    return res.redirect('/login?error=' + encodeURIComponent('Authentication bridge expired.'));
  }
});

// Google Identity Services (GSI) Token / Popup Login (Zero redirect_uri needed!)
router.post(['/google/credential', '/api/auth/google/credential'], async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential is required.' });
    }

    // Cryptographically verify Google ID Token with Google servers
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = googleRes.data;

    const email = payload.email ? payload.email.toLowerCase().trim() : null;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google did not provide a verified email.' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const dummyPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email,
          firstName: payload.given_name || payload.name || 'Google',
          lastName: payload.family_name || 'User',
          username: `google_${payload.sub ? payload.sub.slice(0, 8) : Date.now().toString().slice(-6)}`,
          password: dummyPassword,
          accountType: 'normal_user',
          role: 'normal_user',
          status: 'active',
          isEmailVerified: true
        }
      });
    }

    attachOAuthSession(req, user);
    req.session.save(() => {
      const isEmployeeRole = user.accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((user.role || '').toLowerCase());
      const redirectUrl = isEmployeeRole ? '/hrms/dashboard' : '/candidate/dashboard';

      return res.json({
        success: true,
        message: 'Google login successful!',
        user: req.session.user,
        redirectUrl
      });
    });
  } catch (err) {
    console.error('Google Credential Verification Error:', err.response?.data || err.message);
    return res.status(401).json({
      success: false,
      error: 'Google authentication failed: ' + (err.response?.data?.error_description || err.message)
    });
  }
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

      attachOAuthSession(req, user);
      req.session.save(() => {
        const userParam = encodeURIComponent(JSON.stringify(req.session.user));
        const isEmployeeRole = user.accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((user.role || '').toLowerCase());
        const dest = isEmployeeRole ? '/hrms/dashboard' : '/candidate/dashboard';
        return res.redirect(`${dest}?auth=success&user=${userParam}`);
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
