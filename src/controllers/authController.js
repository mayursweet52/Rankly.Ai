const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const pgDb = require('../config/pgDatabase');
const { generateOtp, generateReferralCode } = require('../utils/helpers');
const { sendOTPEmail, sendOtpEmail, sendVerificationLinkEmail, sendPasswordResetLinkEmail } = require('../services/emailService');
const { recordAuthFailure, resetAuthFailure } = require('../middleware/authRateLimit');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Strict Multi-Layer Check if an Email is Already Registered in System
 */
async function findExistingUserByEmail(email, req = null) {
  if (!email) return null;
  const cleanEmail = String(email).toLowerCase().trim();
  if (!cleanEmail) return null;

  // 1. Check active authenticated session if provided
  try {
    if (req && req.session && req.session.userEmail && req.session.userEmail.toLowerCase().trim() === cleanEmail) {
      return { id: req.session.userId || 'session_user', email: cleanEmail, source: 'active_session' };
    }
  } catch (_) {}

  // 2. Check Prisma SQLite User table (email, workEmail, username)
  try {
    const directUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail } },
          { workEmail: { equals: cleanEmail } },
          { username: { equals: cleanEmail } }
        ]
      }
    });
    if (directUser) return directUser;
  } catch (_) {}

  // 3. Case-insensitive raw SQLite query fallback on User table
  try {
    const rawUsers = await prisma.$queryRawUnsafe(
      'SELECT id, email, role, isEmailVerified FROM "User" WHERE LOWER(email) = LOWER(?) OR LOWER(workEmail) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
      cleanEmail, cleanEmail, cleanEmail
    );
    if (rawUsers && rawUsers.length > 0) return rawUsers[0];
  } catch (_) {}

  // 4. Check Prisma Employee & Candidate models
  try {
    if (prisma.employee) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { personalEmail: { equals: cleanEmail } },
            { workEmail: { equals: cleanEmail } }
          ]
        }
      });
      if (emp) return { id: emp.id, email: emp.workEmail || emp.personalEmail, source: 'prisma_employee' };
    }
  } catch (_) {}

  try {
    if (prisma.candidate) {
      const cand = await prisma.candidate.findFirst({
        where: { email: { equals: cleanEmail } }
      });
      if (cand && cand.email) return { id: cand.id, email: cand.email, source: 'prisma_candidate' };
    }
  } catch (_) {}

  // 5. Check live PostgreSQL employees & candidates
  try {
    if (pgDb && typeof pgDb.query === 'function') {
      const pgEmp = await pgDb.query('SELECT employee_id as id, email, role FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1;', [cleanEmail]);
      if (pgEmp && pgEmp.rows && pgEmp.rows.length > 0) return { id: pgEmp.rows[0].id, email: pgEmp.rows[0].email, source: 'pg_employee' };

      const pgCand = await pgDb.query('SELECT id, email, status FROM candidates WHERE LOWER(email) = LOWER($1) LIMIT 1;', [cleanEmail]);
      if (pgCand && pgCand.rows && pgCand.rows.length > 0) return { id: pgCand.rows[0].id, email: pgCand.rows[0].email, source: 'pg_candidate' };
    }
  } catch (_) {}

  return null;
}

function failAuth(res, req, message, identifier = null, statusCode = 400, extra = {}) {
  recordAuthFailure(req, identifier);
  return sendError(res, message, statusCode, extra);
}

function formatUserResponse(user) {
  if (!user) return null;
  const { password: _, ...userSafe } = user;
  return {
    ...userSafe,
    fname: userSafe.firstName,
    lname: userSafe.lastName || '',
    isEmployee: userSafe.accountType === 'employee',
    verified: { email: !!userSafe.isEmailVerified, phone: !!userSafe.isPhoneVerified },
    resumes: [],
    matches: 0,
    theme: 'light'
  };
}

function getAppBaseUrl(req) {
  if (req) {
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host;
    if (rawHost) {
      const host = rawHost.split(',')[0].trim();
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      return `${proto}://${host}`;
    }
  }
  const appUrl = (process.env.APP_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
  if (appUrl && !appUrl.includes('trycloudflare.com') && !appUrl.includes('rankly-ai-production')) {
    return appUrl;
  }
  return 'https://ranklyai-production.up.railway.app';
}

// Disallowed personal email domains for corporate workspace registrations
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'yahoo.com.au', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'passport.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aim.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com',
  'mail.com', 'email.com', 'usa.com', 'consultant.com',
  'gmx.com', 'gmx.net', 'gmx.de',
  'yandex.com', 'yandex.ru',
  'rediffmail.com',
  'tutanota.com', 'tuta.com', 'tuta.io',
  'fastmail.com',
  'inbox.com', 'lycos.com'
]);

/**
 * Validate Email Format, Domain Structure, and Workmail Requirement
 */
function validateEmailAddress(email, isEmployee = false) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email address is required.' };
  }
  const clean = email.trim().toLowerCase();
  
  // Format check (e.g. user@domain.com)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, message: '❌ Invalid email format. Please enter a valid email address.' };
  }

  const [username, domain] = clean.split('@');
  if (!username || !domain || domain.indexOf('.') === -1) {
    return { valid: false, message: '❌ Invalid email domain structure.' };
  }

  // Check for fake / non-existent / throwaway test domains
  const fakeDomains = ['fakedomain123.com', 'test.com', 'example.com', 'fake.com', 'tempmail.com', 'mailinator.com', 'throwaway.com'];
  if (fakeDomains.includes(domain)) {
    return { valid: false, message: '❌ This email domain is not accepted. Please provide a real email address.' };
  }

  // Strict Work Email Enforcement for Company / Workspace Registration
  if (isEmployee && PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      message: `❌ Personal email addresses (@${domain}) are not allowed for Company Workspace registration. Please use your official corporate work email (e.g. name@company.com).`
    };
  }

  return { valid: true, email: clean, domain };
}

/**
 * Register User (Normal Jobseeker or Enterprise / Company Employee)
 */
async function register(req, res) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      fname,
      lname,
      accountType,
      isEmployee,
      phone,
      username,
      dob,
      age,
      gender,
      profession,
      targetProfession,
      linkedInUrl,
      orgName,
      organizationName,
      company,
      referralCode,
      role
    } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const effectiveFirstName = (firstName || fname || '').trim();
    const effectiveLastName = (lastName || lname || '').trim();
    const effectivePassword = (password || '').trim();
    const effectivePhone = (phone || '').trim() || null;
    const effectiveOrgName = (organizationName || company || orgName || '').trim();
    const isEmp = isEmployee === true || isEmployee === 'true' || accountType === 'employee' || !!effectiveOrgName || !!referralCode;
    const effectiveAccountType = isEmp ? 'employee' : 'normal_user';
    const effectiveRole = isEmp ? (role === 'normal' ? 'hr' : (role || 'hr')) : 'normal_user';

    // Strict Email Validation
    const emailValidation = validateEmailAddress(normalizedEmail, isEmp);
    if (!emailValidation.valid) return failAuth(res, req, emailValidation.message, normalizedEmail);

    // 🔒 STRICT CHECK: Do not allow registration if account already exists
    const existingUser = await findExistingUserByEmail(normalizedEmail);
    if (existingUser) {
      return failAuth(res, req, 'An account with this email already exists. Please log in.', normalizedEmail, 409, { code: 'EMAIL_ALREADY_EXISTS', alreadyRegistered: true });
    }

    // Corporate / Organization Workspace Registration requires verified workmail OTP
    if (isEmp) {
      let isVerified = false;

      // Tier 1: Cryptographic JWT Verification Token (from Authorization header or request body)
      const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
      const clientToken = (req.body.verificationToken || req.body.token || 
        (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : null));

      if (clientToken) {
        try {
          const decoded = jwt.verify(clientToken, jwtSecret);
          if (decoded && (decoded.email || '').toLowerCase().trim() === normalizedEmail) {
            isVerified = true;
            console.log(`✅ [Register] Verified work email via JWT token for: ${normalizedEmail}`);
          }
        } catch (jwtErr) {
          console.warn('⚠️ [Register Verification Token invalid]:', jwtErr.message);
        }
      }

      // Tier 2: Active Authenticated Session matching the normalized email
      if (!isVerified && req.session && req.session.userEmail && req.session.userEmail.toLowerCase().trim() === normalizedEmail) {
        isVerified = true;
        console.log(`✅ [Register] Verified work email via active session for: ${normalizedEmail}`);
      }

      // Tier 3: Database OTP Record (matching email & isUsed: true)
      if (!isVerified) {
        const verifiedOtp = await prisma.oTP.findFirst({
          where: {
            email: normalizedEmail,
            isUsed: true
          },
          orderBy: { createdAt: 'desc' }
        });
        if (verifiedOtp) {
          const ageMs = verifiedOtp.createdAt ? (Date.now() - new Date(verifiedOtp.createdAt).getTime()) : 0;
          if (isNaN(ageMs) || ageMs <= 24 * 60 * 60 * 1000) {
            isVerified = true;
            console.log(`✅ [Register] Verified work email via DB OTP record for: ${normalizedEmail}`);
          }
        }
      }

      // Tier 4: Direct OTP code provided in body
      if (!isVerified && req.body.otp) {
        const cleanOtp = String(req.body.otp).replace(/\D/g, '').trim();
        const directOtp = await prisma.oTP.findFirst({
          where: {
            email: normalizedEmail,
            otp: cleanOtp
          },
          orderBy: { createdAt: 'desc' }
        });
        if (directOtp) {
          isVerified = true;
          await prisma.oTP.updateMany({ where: { email: normalizedEmail }, data: { isUsed: true } });
          console.log(`✅ [Register] Verified work email via direct body OTP for: ${normalizedEmail}`);
        }
      }

      if (!isVerified) {
        return failAuth(res, req, '❌ Corporate work email verification required. Please verify the 6-digit OTP sent to your work email before creating workspace.', normalizedEmail);
      }
    }

    if (!effectiveFirstName) return failAuth(res, req, 'First name is required.', normalizedEmail);
    if (!effectivePassword) return failAuth(res, req, 'Password is required.', normalizedEmail);
    if (effectivePassword.length < 6) return failAuth(res, req, 'Password must be at least 6 characters long.', normalizedEmail);

    // Unique Username handling (fallback to email prefix if not provided or collision)
    let candidateUsername = (username || normalizedEmail.split('@')[0] || `user_${Date.now()}`).trim();
    const existingUsername = await prisma.user.findUnique({
      where: { username: candidateUsername }
    });
    if (existingUsername) {
      candidateUsername = `${candidateUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(effectivePassword, salt);

    let assignedOrgId = null;
    let assignedRole = effectiveRole;

    // Handle Referral Code (Enterprise / Company Team Invite)
    if (referralCode) {
      const codeRecord = await prisma.referralCode.findUnique({
        where: { code: referralCode.toUpperCase().trim() },
        include: { organization: true }
      });

      if (!codeRecord || codeRecord.isUsed || codeRecord.expiresAt < new Date()) {
        return failAuth(res, req, 'Invalid or expired organization referral code.', normalizedEmail);
      }

      assignedOrgId = codeRecord.organizationId;
      assignedRole = codeRecord.assignedRole || 'hr';

      const newUsedCount = codeRecord.usedCount + 1;
      await prisma.referralCode.update({
        where: { id: codeRecord.id },
        data: {
          usedCount: newUsedCount,
          isUsed: newUsedCount >= codeRecord.maxUses
        }
      });
    }

    // Safely parse date of birth and validate age (Min 15+ for candidates, Min 18+ for company employees)
    let parsedDob = null;
    let parsedAge = null;
    const minRequiredAge = isEmp ? 18 : 15;

    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
        
        if (calculatedAge < minRequiredAge) {
          const errText = isEmp ? '❌ You must be at least 18 years old to register as a company employee.' : '❌ You must be at least 15 years old to register.';
          return failAuth(res, req, errText, normalizedEmail);
        }
        parsedDob = birthDate;
        parsedAge = calculatedAge;
      }
    } else if (age) {
      const a = parseInt(age, 10);
      if (!isNaN(a)) {
        if (a < minRequiredAge) {
          const errText = isEmp ? '❌ You must be at least 18 years old to register as a company employee.' : '❌ You must be at least 15 years old to register.';
          return failAuth(res, req, errText, normalizedEmail);
        }
        parsedAge = a;
      }
    }

    // Handle Phone unique constraint safely
    let safePhone = effectivePhone;
    if (safePhone) {
      const phoneExists = await prisma.user.findFirst({ where: { phone: safePhone } });
      if (phoneExists) safePhone = null; // Do not fail registration on duplicate phone
    }

    // Create User in SQLite Database via Prisma
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: effectiveFirstName,
          lastName: effectiveLastName || null,
          username: candidateUsername,
          phone: safePhone,
          accountType: effectiveAccountType,
          role: assignedOrgId ? assignedRole : (orgName ? 'admin' : (effectiveAccountType === 'employee' ? assignedRole : 'normal_user')),
          profession: profession || targetProfession || (isEmp ? assignedRole : null),
          linkedInUrl: linkedInUrl || null,
          age: parsedAge,
          dob: parsedDob,
          gender: gender || null,
          status: 'active',
          isEmailVerified: false, // Set false until Gmail link verification is clicked
          isPhoneVerified: true,
          organizationId: assignedOrgId
        }
      });
    } catch (createErr) {
      if (createErr.code === 'P2002' || (createErr.message && createErr.message.includes('Unique constraint'))) {
        newUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!newUser) throw createErr;
      } else {
        throw createErr;
      }
    }

    // If Enterprise Admin provided a new organization name
    if (effectiveOrgName && !assignedOrgId) {
      const newOrg = await prisma.organization.create({
        data: {
          name: effectiveOrgName,
          adminId: newUser.id
        }
      });

      await prisma.user.update({
        where: { id: newUser.id },
        data: { organizationId: newOrg.id, role: 'admin' }
      });
    }

    // Generate unique verification token & link for Gmail verification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.oTP.create({
      data: {
        email: normalizedEmail,
        otp: verificationToken,
        type: 'email_verification_link',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
      }
    });

    const baseUrl = getAppBaseUrl(req);
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    const fullName = `${effectiveFirstName} ${effectiveLastName}`.trim() || newUser.username || 'Developer';
    await sendVerificationLinkEmail({
      to: normalizedEmail,
      fullName,
      verifyLink
    });

    console.log(`\n======================================================`);
    console.log(`🔗 [LIVE VERIFY LINK]: >>> ${verifyLink} <<< (Sent to: ${normalizedEmail})`);
    console.log(`======================================================\n`);

    // Reset any auth failure backoff upon successful registration
    resetAuthFailure(req, normalizedEmail);

    // Fetch full user with organization
    const createdUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { organization: true }
    });

    const responseUser = formatUserResponse(createdUser);
    if (responseUser) responseUser.verified = { email: false, phone: true };

    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message: "Account created! Please check your Gmail to verify your account.",
      email: normalizedEmail,
      verifyLink, // Available for instant dev inspection
      user: responseUser
    });
  } catch (error) {
    recordAuthFailure(req);
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create account: ' + error.message,
      message: 'Failed to create account: ' + error.message
    });
  }
}

/**
 * Login User (Session-Based, supports Email, Username, Phone)
 */
async function login(req, res) {
  try {
    const { email, username, identifier, password } = req.body;
    const searchId = (identifier || email || username || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    if (!searchId || !cleanPassword) return failAuth(res, req, 'Please enter your email/username and password.', searchId);

    // Find User by email, username, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchId },
          { username: searchId },
          { phone: searchId }
        ]
      },
      include: { organization: true }
    });

    if (!user) return failAuth(res, req, 'Invalid credentials. User not found.', searchId, 401);
    if (user.status === 'suspended') return failAuth(res, req, 'Your account has been suspended. Please contact support.', searchId, 403);

    // Verify Password
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    if (!isPasswordValid) return failAuth(res, req, 'Invalid email or password.', searchId, 401);

    // Reset failure backoff upon successful credentials check
    resetAuthFailure(req, searchId);
    if (user.email) resetAuthFailure(req, user.email);

    // Strict Verification Gate: Block unverified users from entering dashboard
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        email: user.email,
        error: 'Email is not verified. Please check your Gmail and click the verification link to unlock your dashboard.',
        message: 'Email is not verified. Please check your Gmail and click the verification link to unlock your dashboard.'
      });
    }

    // Establish Express Session with dynamic Remember Me cookie lifespan
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.accountType = user.accountType;
    req.session.user = formatUserResponse(user);

    const isRemember = req.body.rememberMe === true || req.body.rememberMe === 'true';
    if (req.session && req.session.cookie) {
      if (isRemember) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days persistent
      } else {
        req.session.cookie.expires = false; // Browser session cookie (terminates on browser/tab close)
        req.session.cookie.maxAge = null;   // Transient session cookie
      }
    }

    const isEmployeeRole = user.accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((user.role || '').toLowerCase());
    const redirectUrl = isEmployeeRole ? '/hrms/dashboard' : '/candidate/dashboard';

    req.session.save((err) => {
      if (err) console.error('Session Save Error:', err);

      return res.json({
        success: true,
        message: 'Login successful.',
        user: formatUserResponse(user),
        token: req.sessionID || `session_${user.id}`,
        redirectUrl
      });
    });
  } catch (error) {
    recordAuthFailure(req);
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login.',
      message: 'Internal server error during login.'
    });
  }
}

/**
 * Logout User
 */
function logout(req, res) {
  try {
    if (req.session && typeof req.logout === 'function') {
      try { req.logout({ keepSessionInfo: false }, () => {}); } catch (e) {}
    }

    const clearAllCookies = () => {
      res.clearCookie('connect.sid', { path: '/' });
      res.clearCookie('token', { path: '/' });
      res.clearCookie('jwt', { path: '/' });
      res.clearCookie('rankly_session', { path: '/' });
    };

    if (req.session) {
      req.session.destroy((err) => {
        clearAllCookies();
        return res.json({
          success: true,
          message: 'Logged out successfully.'
        });
      });
    } else {
      clearAllCookies();
      return res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    }
  } catch (e) {
    res.clearCookie('connect.sid', { path: '/' });
    return res.json({ success: true, message: 'Logged out successfully.' });
  }
}



/**
 * Get Current Authenticated User (Session Context)
 */
async function getMe(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
        message: 'No active session'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { organization: true }
    });

    if (!user) {
      req.session.destroy();
      return res.json({
        success: true,
        authenticated: false,
        user: null,
        message: 'User not found or session expired'
      });
    }

    const responseUser = formatUserResponse(user);

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        user: responseUser,
        error: 'Email is not verified. Please verify your email via the link sent to your Gmail inbox.',
        message: 'Email is not verified. Please verify your email via the link sent to your Gmail inbox.'
      });
    }

    return res.json({
      success: true,
      user: responseUser
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve session user.', message: 'Failed to retrieve session user.' });
  }
}

/**
 * Send OTP for Email Verification or Password Reset
 */
async function sendOtp(req, res) {
  try {
    const { email, identifier, to, workEmail, corporateEmail, isEmployee, type = 'email_verification' } = req.body;
    const recipientEmail = (email || identifier || to || workEmail || corporateEmail || req.body.email || '').toLowerCase().trim();

    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Email address is required.', message: 'Email address is required.' });
    }

    // 🔒 ABSOLUTE FIRST CHECK: If registering and email already exists in system, BLOCK IMMEDIATELY!
    if (type !== 'password_reset' && type !== 'change_password' && req.body.purpose !== 'login') {
      const existingUser = await findExistingUserByEmail(recipientEmail, req);
      if (existingUser) {
        console.log(`🔒 [sendOtp] Blocked OTP dispatch: email already exists (${recipientEmail})`);
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          alreadyRegistered: true,
          error: 'An account with this email already exists. Please log in.',
          message: 'An account with this email already exists. Please log in.'
        });
      }
    }

    const isEmp = isEmployee === true || isEmployee === 'true' || type === 'corporate_email_verification' || !!workEmail || !!corporateEmail || !!req.body.orgName || !!req.body.organizationName;
    const emailValidation = validateEmailAddress(recipientEmail, isEmp);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, error: emailValidation.message, message: emailValidation.message });
    }

    if (type === 'password_reset') {
      const user = await prisma.user.findUnique({ where: { email: recipientEmail } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'No account found with this email address.', message: 'No account found with this email address.' });
      }
    }

    // Cooldown check (2s) to prevent double clicks while allowing smooth Resend OTP
    const recentOtp = await prisma.oTP.findFirst({
      where: {
        email: recipientEmail,
        createdAt: { gte: new Date(Date.now() - 2 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (recentOtp) {
      return res.status(429).json({
        success: false,
        error: 'Please wait 2 seconds before requesting another code.',
        message: 'Please wait 2 seconds before requesting another code.'
      });
    }

    // Invalidate expired OTPs only; keep recent unexpired codes active until verified
    await prisma.oTP.updateMany({
      where: { email: recipientEmail, isUsed: false, expiresAt: { lte: new Date() } },
      data: { isUsed: true }
    });

    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.create({
      data: {
        email: recipientEmail,
        otp: otpCode,
        type,
        expiresAt
      }
    });

    // Ultra-Fast Email Dispatch: Fire real verification email with non-blocking 400ms quick-race
    const emailPromise = sendOTPEmail(recipientEmail, otpCode, type).catch(emailErr => {
      console.warn('⚠️ [OTP Email Dispatch Warning]:', emailErr.message);
    });

    try {
      await Promise.race([
        emailPromise,
        new Promise(resolve => setTimeout(resolve, 400))
      ]);
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${recipientEmail}. Please check your inbox or spam folder.`,
      email: recipientEmail,
      details: `A 6-digit verification code has been sent to ${recipientEmail}. Please check your inbox or spam folder.`
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send verification email: ' + (error.message || 'SMTP delivery failed'), 
      message: 'Failed to send verification email: ' + (error.message || 'SMTP delivery failed') 
    });
  }
}

/**
 * Verify OTP
 */
async function verifyOtp(req, res) {
  try {
    const { email, identifier, to, otp, type = 'email_verification' } = req.body;
    const recipientEmail = (email || identifier || to || '').toLowerCase().trim();
    // Strip non-alphanumerics (removes spaces, &nbsp;, \u00A0, dashes, quotes, newlines)
    const cleanOtp = (otp || '').toString().replace(/[^0-9a-zA-Z]/g, '').trim();

    console.log(`🔍 [VERIFY-OTP REQUEST] Email: "${recipientEmail}", Clean OTP: "${cleanOtp}", Raw: "${otp}"`);

    if (!recipientEmail || !cleanOtp) return failAuth(res, req, 'Email and OTP code are required.', recipientEmail);

    // 1. Primary check: Unused, unexpired OTP matching the clean code
    let otpRecord = await prisma.oTP.findFirst({
      where: {
        email: recipientEmail,
        otp: cleanOtp,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fallback check: Match any valid unused OTP for this email created in the last 15 minutes
    if (!otpRecord) {
      const recentOtp = await prisma.oTP.findFirst({
        where: {
          email: recipientEmail,
          otp: cleanOtp,
          isUsed: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (recentOtp) {
        console.log(`ℹ️ [VERIFY-OTP] Accepted matching OTP (${cleanOtp}) created recently at ${recentOtp.createdAt}`);
        otpRecord = recentOtp;
      }
    }

    if (!otpRecord) {
      console.warn(`❌ [VERIFY-OTP FAILED] No matching OTP found for email: "${recipientEmail}", clean OTP: "${cleanOtp}"`);
      return failAuth(res, req, 'Invalid or expired OTP code.', recipientEmail);
    }

    // Invalidate all pending OTPs for this recipient email upon successful match
    await prisma.oTP.updateMany({
      where: { email: recipientEmail },
      data: { isUsed: true }
    });

    // Check if user exists and mark verified
    let user = await prisma.user.findUnique({
      where: { email: recipientEmail }
    });

    if (user && type === 'email_verification') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true }
      });
    }

    // Generate secure JWT Token (7-day validity)
    const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
    const tokenPayload = {
      id: user ? user.id : recipientEmail,
      userId: user ? user.id : recipientEmail,
      email: recipientEmail,
      role: user ? user.role : 'authenticated',
      verified: true
    };
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

    // Establish active session
    if (req.session) {
      req.session.authenticated = true;
      req.session.userEmail = recipientEmail;
      req.session.jwtToken = token;
      if (user) {
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          email: user.email,
          fname: user.fname,
          lname: user.lname,
          role: user.role
        };
      }
    }

    // Reset backoff counter on successful OTP verification
    resetAuthFailure(req, recipientEmail);

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.',
      token,
      user: user ? {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role
      } : { email: recipientEmail, verified: true }
    });
  } catch (error) {
    recordAuthFailure(req);
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP.', message: 'Failed to verify OTP.' });
  }
}

/**
 * Forgot Password - Send Reset OTP (Normal Candidate / User Flow)
 * Validates that email exists in the web application before sending reset code/link
 */
async function forgotPassword(req, res) {
  try {
    const { email, identifier, to } = req.body;
    const recipientEmail = (email || identifier || to || '').toLowerCase().trim();

    if (!recipientEmail) return failAuth(res, req, 'Email address is required.', recipientEmail);

    const emailValidation = validateEmailAddress(recipientEmail, false);
    if (!emailValidation.valid) return failAuth(res, req, emailValidation.message, recipientEmail);

    // Check if user is registered in the web application
    const user = await prisma.user.findUnique({
      where: { email: recipientEmail }
    });

    if (!user) {
      return failAuth(res, req, 'No account found with this email address. Please check the email or sign up.', recipientEmail, 404);
    }

    // Invalidate prior active OTPs for this email
    await prisma.oTP.updateMany({
      where: { email: recipientEmail, isUsed: false },
      data: { isUsed: true }
    });

    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes;

    await prisma.oTP.create({
      data: {
        email: recipientEmail,
        otp: otpCode,
        type: 'password_reset',
        expiresAt
      }
    });

    // Send real verification / reset code email in background
    sendOTPEmail(recipientEmail, otpCode, 'password_reset').catch(err => {
      console.error('⚠️ [Background Forgot Password OTP Email Error]:', err.message);
    });

    return res.json({
      success: true,
      message: `Password reset instructions sent to ${recipientEmail}. Please check your inbox or spam folder.`
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process password reset request: ' + error.message,
      message: 'Failed to process password reset request: ' + error.message
    });
  }
}

/**
 * Reset Password with Verified OTP (Normal Candidate / User Flow)
 */
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail || !otp || !newPassword) return failAuth(res, req, 'Email, OTP code, and new password are required.', normalizedEmail);
    if (newPassword.length < 6) return failAuth(res, req, 'Password must be at least 6 characters long.', normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) return failAuth(res, req, 'No account registered with this email address.', normalizedEmail, 404);

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        otp: otp.trim(),
        type: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) return failAuth(res, req, 'Invalid or expired OTP session. Please request a new code.', normalizedEmail);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword }
    });

    await prisma.oTP.updateMany({
      where: { email: normalizedEmail, type: 'password_reset' },
      data: { isUsed: true }
    });

    // Reset backoff counter on successful password reset
    resetAuthFailure(req, normalizedEmail);

    return res.json({
      success: true,
      message: '🎉 Password reset successfully. You can now log in.'
    });
  } catch (error) {
    recordAuthFailure(req);
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password: ' + (error.message || 'Server error'), message: 'Failed to reset password.' });
  }
}

/**
 * 1. Verify Forgot Password OTP & Send Reset Link to Gmail
 */
async function verifyForgotOtpAndSendLink(req, res) {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim();

    if (!cleanEmail || !cleanOtp) return failAuth(res, req, 'Email and OTP code are required.', cleanEmail);

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return failAuth(res, req, 'No user found with this email address.', cleanEmail, 404);

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: cleanEmail,
        otp: cleanOtp,
        type: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) return failAuth(res, req, 'Invalid or expired OTP code. Please request a new code.', cleanEmail);

    // Invalidate the OTP now that it's verified
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    // Generate cryptographic reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.oTP.create({
      data: {
        email: cleanEmail,
        otp: resetToken,
        type: 'password_reset_link',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    // Build dynamic reset link using current host / Cloudflare tunnel
    const baseUrl = getAppBaseUrl(req);
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
    await sendPasswordResetLinkEmail({
      to: cleanEmail,
      fullName,
      resetLink
    });

    console.log(`\n======================================================`);
    console.log(`🔗 [PASSWORD RESET LINK SENT]: >>> ${resetLink} <<< (Sent to: ${cleanEmail})`);
    console.log(`======================================================\n`);

    return res.json({
      success: true,
      message: `Identity verified! A secure Password Reset Link has been sent to ${cleanEmail}. Please check your Gmail.`,
      email: cleanEmail
    });
  } catch (err) {
    console.error('Verify Forgot OTP Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process request: ' + err.message, message: 'Failed to process request.' });
  }
}

/**
 * 2. Reset Password using verified link token
 */
async function resetPasswordWithToken(req, res) {
  try {
    const { email, token, newPassword } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanToken = (token || '').toString().trim();

    if (!cleanEmail || !cleanToken || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, reset token, and new password are required.', message: 'Email, reset token, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.', message: 'Password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.', message: 'User account not found.' });
    }

    const tokenRecord = await prisma.oTP.findFirst({
      where: {
        email: cleanEmail,
        otp: cleanToken,
        type: 'password_reset_link',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset link. Please request a new one.', message: 'Invalid or expired password reset link. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    await prisma.oTP.update({
      where: { id: tokenRecord.id },
      data: { isUsed: true }
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset Password With Token Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset password: ' + err.message, message: 'Failed to reset password.' });
  }
}

/**
 * 3. Verify OTP & Current Password for Change Password flow
 */
async function verifyChangePasswordCredentials(req, res) {
  try {
    const { email, otp, currentPassword } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim();

    if (!cleanEmail || !cleanOtp || !currentPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP code, and Current Password are required.', message: 'Email, OTP code, and Current Password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email address.', message: 'No account found with this email address.' });
    }

    // 1. Verify Current Password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect. Please enter your valid old password.', message: 'Current password is incorrect. Please enter your valid old password.' });
    }

    // 2. Verify OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: cleanEmail,
        otp: cleanOtp,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code. Please request a new code.', message: 'Invalid or expired OTP code. Please request a new code.' });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    // Generate change token (valid for 15 minutes)
    const changeToken = crypto.randomBytes(32).toString('hex');
    await prisma.oTP.create({
      data: {
        email: cleanEmail,
        otp: changeToken,
        type: 'change_password_token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    return res.json({
      success: true,
      changeToken,
      message: 'Current password and OTP verified! Please enter your new password below.'
    });
  } catch (err) {
    console.error('Verify Change Password Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify credentials: ' + err.message, message: 'Failed to verify credentials.' });
  }
}

/**
 * 4. Submit New Password with verified change token
 */
async function submitChangePassword(req, res) {
  try {
    const { email, changeToken, newPassword } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanToken = (changeToken || '').toString().trim();

    if (!cleanEmail || !cleanToken || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, verification token, and new password are required.', message: 'Email, verification token, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.', message: 'New password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.', message: 'User account not found.' });
    }

    const tokenRecord = await prisma.oTP.findFirst({
      where: {
        email: cleanEmail,
        otp: cleanToken,
        type: 'change_password_token',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'Session expired or invalid. Please verify current password and OTP again.', message: 'Session expired or invalid. Please verify current password and OTP again.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    await prisma.oTP.update({
      where: { id: tokenRecord.id },
      data: { isUsed: true }
    });

    return res.json({
      success: true,
      message: 'Password changed successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Submit Change Password Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update password: ' + err.message, message: 'Failed to update password.' });
  }
}

/**
 * Verify Referral Code (Company Portal Validation Helper)
 */
async function verifyCompanyReferral(req, res) {
  try {
    const { referralCode } = req.body;
    if (!referralCode || !referralCode.trim()) return failAuth(res, req, 'Referral code is required.');

    const cleanCode = referralCode.toUpperCase().trim();
    const referralRecord = await prisma.referralCode.findUnique({
      where: { code: cleanCode },
      include: { organization: true }
    });

    if (!referralRecord) return failAuth(res, req, '❌ Invalid referral code. Password reset attempt denied.');
    if (referralRecord.expiresAt < new Date()) return failAuth(res, req, '❌ Referral code has expired. Password reset attempt denied.');

    return res.json({
      success: true,
      verified: true,
      organizationName: referralRecord.organization?.name || 'Authorized Organization',
      assignedRole: referralRecord.assignedRole || 'hr',
      message: 'Referral code validated successfully.'
    });
  } catch (error) {
    console.error('Verify Referral Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify referral code: ' + error.message,
      message: 'Failed to verify referral code: ' + error.message
    });
  }
}

/**
 * Company Portal Password Reset Flow (Referral Code Verification Required)
 * If referral code is correct, allows password reset; if incorrect, strictly denies attempt.
 */
async function companyResetPassword(req, res) {
  try {
    const { email, identifier, referralCode, newPassword } = req.body;
    const searchId = (email || identifier || '').toLowerCase().trim();
    const cleanReferral = (referralCode || '').toUpperCase().trim();
    const cleanNewPassword = (newPassword || '').trim();

    if (!searchId) return failAuth(res, req, 'Corporate email or work username is required.');
    if (!cleanReferral) return failAuth(res, req, 'Referral code is required to initiate Company Portal password reset.', searchId);
    if (!cleanNewPassword) return failAuth(res, req, 'New password is required.', searchId);
    if (cleanNewPassword.length < 6) return failAuth(res, req, 'Password must be at least 6 characters long.', searchId);

    // 1. Verify Referral Code in Database
    const referralRecord = await prisma.referralCode.findUnique({
      where: { code: cleanReferral },
      include: { organization: true }
    });

    if (!referralRecord) return failAuth(res, req, '❌ Invalid referral code. Password reset attempt denied.', searchId);
    if (referralRecord.expiresAt < new Date()) return failAuth(res, req, '❌ Referral code has expired. Password reset attempt denied.', searchId);

    // 2. Find Organization User
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchId },
          { username: searchId }
        ]
      },
      include: { organization: true }
    });

    if (!user) return failAuth(res, req, '❌ No organization account found with this corporate email/username.', searchId, 404);

    // 3. Hash New Password and Update User Record
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanNewPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // Ensure user is associated with organization if not already
        organizationId: user.organizationId || referralRecord.organizationId
      }
    });

    // 4. Update Referral Code usage
    const newUsedCount = referralRecord.usedCount + 1;
    await prisma.referralCode.update({
      where: { id: referralRecord.id },
      data: {
        usedCount: newUsedCount,
        isUsed: newUsedCount >= referralRecord.maxUses
      }
    });

    // Reset rate limiter on successful reset
    resetAuthFailure(req, searchId);
    if (user.email) resetAuthFailure(req, user.email);

    return res.json({
      success: true,
      message: '🎉 Company Portal password reset successfully. You can now sign in to your workspace.'
    });
  } catch (error) {
    recordAuthFailure(req);
    console.error('Company Reset Password Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset organization password: ' + (error.message || 'Server error'),
      message: 'Failed to reset organization password: ' + (error.message || 'Server error')
    });
  }
}


/**
 * Create Organization
 */
async function createOrganization(req, res) {
  try {
    const { name } = req.body;
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.', message: 'Authentication required.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Organization name is required.', message: 'Organization name is required.' });
    }

    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        adminId: userId
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { organizationId: organization.id, role: 'admin', accountType: 'employee' }
    });

    return res.status(201).json({
      success: true,
      message: 'Organization created successfully.',
      organization
    });
  } catch (error) {
    console.error('Create Organization Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create organization.', message: 'Failed to create organization.' });
  }
}

/**
 * Join Organization via Referral Code
 */
async function joinOrganization(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.', message: 'Authentication required.' });
    }

    if (!code) {
      return res.status(400).json({ success: false, error: 'Referral code is required.', message: 'Referral code is required.' });
    }

    const referral = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { organization: true }
    });

    if (!referral || referral.isUsed || referral.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired referral code.', message: 'Invalid or expired referral code.' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: referral.organizationId,
        role: referral.assignedRole,
        accountType: 'employee'
      }
    });

    const newUsedCount = referral.usedCount + 1;
    await prisma.referralCode.update({
      where: { id: referral.id },
      data: {
        usedCount: newUsedCount,
        isUsed: newUsedCount >= referral.maxUses
      }
    });

    return res.json({
      success: true,
      message: `Successfully joined ${referral.organization.name} as ${referral.assignedRole}.`,
      organization: referral.organization
    });
  } catch (error) {
    console.error('Join Organization Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to join organization.', message: 'Failed to join organization.' });
  }
}

// Render standalone email verification popup card
function renderVerificationResultPage(res, success, message, email = '') {
  const safeEmail = String(email || '').replace(/[&<>"']/g, '');
  const safeMessage = String(message || '').replace(/[&<>"']/g, '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${success ? 'Email Verified Successfully' : 'Verification Failed'} — Rankly.ai</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"/>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Plus Jakarta Sans', system-ui, sans-serif; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F5F5F0;
      color: #111111;
      padding: 20px;
    }
    .verified-card {
      max-width: 480px;
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #E5E5DF;
      border-radius: 28px;
      padding: 42px 32px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
      animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.92) translateY(12px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-badge {
      width: 80px;
      height: 80px;
      margin: 0 auto 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      ${success 
        ? 'background: rgba(16, 185, 129, 0.12); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.25); box-shadow: 0 0 30px rgba(16, 185, 129, 0.18);' 
        : 'background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.25); box-shadow: 0 0 30px rgba(239, 68, 68, 0.18);'}
    }
    h1 {
      font-size: 23px;
      font-weight: 800;
      color: #111111;
      letter-spacing: -0.4px;
      margin-bottom: 10px;
    }
    .email-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(24, 59, 51, 0.06);
      border: 1px solid rgba(24, 59, 51, 0.15);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: #183B33;
      margin-bottom: 18px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #666660;
      margin-bottom: 30px;
    }
    .btn-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      background: #183B33;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(24, 59, 51, 0.22);
      text-decoration: none;
    }
    .btn-primary:hover {
      background: #112a24;
      transform: translateY(-1px);
    }
    .btn-secondary {
      width: 100%;
      padding: 13px 20px;
      border-radius: 14px;
      background: transparent;
      color: #555550;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #E5E5DF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: #F8F8F5;
      color: #111111;
    }
  </style>
</head>
<body>
  <div class="verified-card">
    <div class="icon-badge">
      <i class="${success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}"></i>
    </div>
    <h1>${success ? 'Email Verified Successfully! 🎉' : 'Verification Failed'}</h1>
    ${safeEmail ? `
    <div class="email-chip">
      <i class="fa-regular fa-envelope"></i>
      <span>${safeEmail}</span>
    </div>
    ` : ''}
    <p>${safeMessage}</p>
    <div class="btn-container">
      ${success ? `
      <button type="button" class="btn-primary" onclick="closePopupOrReturn()">
        <i class="fa-solid fa-xmark"></i>
        <span>Close This Window</span>
      </button>
      <a href="/" class="btn-secondary">
        <span>Go to Sign In / Main Site</span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
      ` : `
      <a href="/" class="btn-primary">
        <span>Return to Sign In</span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
      `}
    </div>
  </div>

  <script>
    ${success ? `
    // Cross-tab broadcast to notify Tab 1 (Main Site) instantly
    try {
      localStorage.setItem('rankly_verified_email', '${safeEmail}');
      localStorage.setItem('rankly_email_verified_event', Date.now().toString());
      if (window.opener) {
        window.opener.postMessage({ type: 'EMAIL_VERIFIED', email: '${safeEmail}' }, '*');
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('rankly_auth_channel');
        bc.postMessage({ type: 'EMAIL_VERIFIED', email: '${safeEmail}' });
      }
    } catch (e) {}

    function closePopupOrReturn() {
      window.close();
      setTimeout(function() {
        window.location.href = '/';
      }, 400);
    }
    ` : ''}
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(success ? 200 : 400).send(html);
}

/**
 * Final Step: Verify Email Link from Gmail (Shows Popup - Does NOT auto-open full website in this tab)
 */
async function verifyEmailLink(req, res) {
  try {
    const { token, email } = req.query;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!token || !normalizedEmail) {
      return renderVerificationResultPage(res, false, 'Missing verification token or email. Please open the complete link sent to your email.');
    }

    const cleanToken = token.trim();

    // 1. Check if user exists in database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail } },
          { workEmail: { equals: normalizedEmail } }
        ]
      },
      include: { organization: true }
    });

    // 2. If user is ALREADY verified, immediately show success page and establish session
    if (user && user.isEmailVerified) {
      console.log(`ℹ️ [verifyEmailLink] User ${normalizedEmail} is already verified.`);
      
      const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
      const effectiveRole = user.role || 'normal';
      const effectiveAccountType = user.accountType || (['admin', 'hr', 'employee'].includes(effectiveRole.toLowerCase()) ? 'employee' : 'candidate');

      const tokenPayload = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: effectiveRole,
        accountType: effectiveAccountType,
        isEmailVerified: true,
        verified: true
      };
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

      if (req.session) {
        req.session.authenticated = true;
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.jwtToken = sessionToken;
        req.session.user = {
          id: user.id,
          email: user.email,
          fname: user.firstName,
          lname: user.lastName,
          username: user.username,
          role: effectiveRole,
          accountType: effectiveAccountType,
          organizationId: user.organizationId,
          isEmailVerified: true
        };
      }

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      };
      res.cookie('token', sessionToken, cookieOptions);
      res.cookie('jwt', sessionToken, cookieOptions);

      return renderVerificationResultPage(res, true, 'Your email has been verified successfully! You can now close this tab and sign in.', normalizedEmail);
    }

    // 3. Look for matching verification token record
    const tokenRecord = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        otp: cleanToken,
        type: 'email_verification_link'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return renderVerificationResultPage(res, false, 'Invalid or expired verification link. Please sign in or request a new one.', normalizedEmail);
    }

    // 4. Mark token as used
    await prisma.oTP.update({
      where: { id: tokenRecord.id },
      data: { isUsed: true }
    });

    // 5. Mark User isEmailVerified: true in Prisma SQLite & PostgreSQL
    await prisma.user.updateMany({
      where: {
        OR: [
          { email: normalizedEmail },
          { workEmail: normalizedEmail }
        ]
      },
      data: { isEmailVerified: true }
    });

    if (pgDb && typeof pgDb.query === 'function') {
      try {
        await pgDb.query('UPDATE candidates SET status = $1 WHERE LOWER(email) = LOWER($2);', ['verified', normalizedEmail]);
        await pgDb.query('UPDATE employees SET updated_at = NOW() WHERE LOWER(email) = LOWER($1);', [normalizedEmail]);
      } catch (_) {}
    }

    // 6. Fetch refreshed user & establish session
    const verifiedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail } },
          { workEmail: { equals: normalizedEmail } }
        ]
      },
      include: { organization: true }
    });

    if (verifiedUser) {
      const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
      const effectiveRole = verifiedUser.role || 'normal';
      const effectiveAccountType = verifiedUser.accountType || (['admin', 'hr', 'employee'].includes(effectiveRole.toLowerCase()) ? 'employee' : 'candidate');

      const tokenPayload = {
        id: verifiedUser.id,
        userId: verifiedUser.id,
        email: verifiedUser.email,
        role: effectiveRole,
        accountType: effectiveAccountType,
        isEmailVerified: true,
        verified: true
      };
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

      if (req.session) {
        req.session.authenticated = true;
        req.session.userId = verifiedUser.id;
        req.session.userEmail = verifiedUser.email;
        req.session.jwtToken = sessionToken;
        req.session.user = {
          id: verifiedUser.id,
          email: verifiedUser.email,
          fname: verifiedUser.firstName,
          lname: verifiedUser.lastName,
          username: verifiedUser.username,
          role: effectiveRole,
          accountType: effectiveAccountType,
          organizationId: verifiedUser.organizationId,
          isEmailVerified: true
        };
      }

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      };
      res.cookie('token', sessionToken, cookieOptions);
      res.cookie('jwt', sessionToken, cookieOptions);
    }

    console.log(`✅ [EMAIL VERIFIED]: ${normalizedEmail} successfully verified.`);
    return renderVerificationResultPage(res, true, 'Your email has been verified successfully! You can now close this tab and return to your application.', normalizedEmail);
  } catch (error) {
    console.error('Verify Email Link Error:', error);
    return renderVerificationResultPage(res, false, 'Failed to verify email link. Please try again.');
  }
}

/**
 * 🔄 Check Email Verification Status (Real-Time Background Poller)
 * Enables Tab 1 to automatically detect verification and log in to the main site immediately.
 */
async function checkVerificationStatus(req, res) {
  try {
    const email = (req.query.email || req.body?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });

    if (!user) {
      return res.json({ success: true, verified: false });
    }

    if (user.isEmailVerified) {
      const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
      const effectiveRole = user.role || 'normal';
      const effectiveAccountType = user.accountType || (['admin', 'hr', 'employee'].includes(effectiveRole.toLowerCase()) ? 'employee' : 'candidate');

      const tokenPayload = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: effectiveRole,
        accountType: effectiveAccountType,
        isEmailVerified: true,
        verified: true
      };
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });

      if (req.session) {
        req.session.authenticated = true;
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.jwtToken = sessionToken;
        req.session.user = {
          id: user.id,
          email: user.email,
          fname: user.fname,
          lname: user.lname,
          username: user.username,
          role: effectiveRole,
          accountType: effectiveAccountType,
          organizationId: user.organizationId,
          isEmailVerified: true
        };
      }

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      };
      res.cookie('token', sessionToken, cookieOptions);
      res.cookie('jwt', sessionToken, cookieOptions);

      const userPayload = {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        username: user.username,
        role: effectiveRole,
        accountType: effectiveAccountType,
        organizationId: user.organizationId,
        organizationName: user.organization ? user.organization.name : null,
        isEmailVerified: true
      };

      return res.json({
        success: true,
        verified: true,
        token: sessionToken,
        user: userPayload
      });
    }

    return res.json({ success: true, verified: false });
  } catch (err) {
    console.error('Check Verification Status Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 🔄 1. Resend OTP Controller
 */
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required", message: "Email is required" });
    }
    const cleanEmail = email.toLowerCase().trim();

    // 🔒 Pre-check for registration flows: If email already has an account, reject resend OTP request
    if (req.body.type !== 'password_reset' && req.body.type !== 'change_password' && req.body.purpose !== 'login') {
      const existingUser = await findExistingUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          alreadyRegistered: true,
          error: 'An account with this email already exists. Please log in.',
          message: 'An account with this email already exists. Please log in.'
        });
      }
    }

    // 1. Invalidate only expired OTPs; keep recent active until verified
    await prisma.oTP.updateMany({
      where: { email: cleanEmail, isUsed: false, expiresAt: { lte: new Date() } },
      data: { isUsed: true }
    });

    // 2. Generate fresh 6-digit OTP (10 mins)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.create({
      data: {
        email: cleanEmail,
        otp: newOtp,
        type: 'email_verification',
        expiresAt
      }
    });

    // 3. Dispatch Email with user's resend subject
    const subject = `Your Rankly.ai verification code is ${newOtp}`;
    try {
      await Promise.race([
        sendOTPEmail(cleanEmail, newOtp, 'email_verification', subject),
        new Promise(resolve => setTimeout(() => resolve(true), 4000))
      ]);
    } catch (emailErr) {
      console.warn('⚠️ [Background Resend OTP Email Error]:', emailErr.message);
    }

    return res.json({ 
      success: true, 
      message: `Verification code resent to ${cleanEmail}. Please check your email inbox and spam folder.`,
      email: cleanEmail
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    return res.status(500).json({ success: false, error: error.message, message: error.message });
  }
}

/**
 * 🔄 2. Resend Verification Link Controller
 */
async function resendLink(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required", message: "Email is required" });
    }
    const cleanEmail = email.toLowerCase().trim();

    // 🔒 If user is already registered AND verified, reject resend verification link
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail } },
          { workEmail: { equals: cleanEmail } }
        ]
      }
    });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        alreadyRegistered: true,
        error: 'Your email is already verified. Please sign in.',
        message: 'Your email is already verified. Please sign in.'
      });
    }

    // 1. Invalidate previous unused verification links
    await prisma.oTP.updateMany({
      where: { email: cleanEmail, type: 'email_verification_link', isUsed: false },
      data: { isUsed: true }
    });

    // 2. Generate 32-byte cryptographic token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.oTP.create({
      data: {
        email: cleanEmail,
        otp: verificationToken,
        type: 'email_verification_link',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    // 3. Build verification link
    const baseUrl = getAppBaseUrl(req);
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(cleanEmail)}`;

    // 4. Dispatch Email with user's requested subject
    const subject = "Verify your email for Rankly.ai";
    try {
      await Promise.race([
        sendVerificationLinkEmail({
          to: cleanEmail,
          fullName: existingUser?.firstName || 'User',
          verifyLink,
          isResend: true,
          customSubject: subject
        }),
        new Promise(resolve => setTimeout(() => resolve(true), 4000))
      ]);
    } catch (emailErr) {
      console.warn('⚠️ [Background Resend Link Email Error]:', emailErr.message);
    }

    return res.json({ 
      success: true, 
      message: `Verification link resent to ${cleanEmail}. Please check your email inbox and spam folder.`,
      email: cleanEmail,
      verifyLink
    });
  } catch (error) {
    console.error('Resend Link Error:', error);
    return res.status(500).json({ success: false, error: error.message, message: error.message });
  }
}

/**
 * 🔒 Check Email Availability & Registration Pre-Flight
 * GET /api/auth/check-email?email=...
 * POST /api/auth/check-email
 * Instant pre-check if an email is available for registration
 */
async function checkEmailAvailability(req, res) {
  try {
    const rawEmail = req.query.email || req.body.email || '';
    if (!rawEmail || !rawEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    const cleanEmail = rawEmail.toLowerCase().trim();
    const existing = await findExistingUserByEmail(cleanEmail, req);
    if (existing) {
      return res.status(409).json({
        success: false,
        email: cleanEmail,
        isAvailable: false,
        alreadyRegistered: true,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists. Please log in.'
      });
    }
    return res.json({
      success: true,
      email: cleanEmail,
      isAvailable: true,
      alreadyRegistered: false,
      message: 'Email is available for registration.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  findExistingUserByEmail,
  register,
  createAccount: register,
  verifyEmailLink,
  resendOtp,
  resendLink,
  login,
  logout,
  getMe,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  companyResetPassword,
  companyForgotPassword: companyResetPassword,
  verifyCompanyReferral,
  verifyForgotOtpAndSendLink,
  resetPasswordWithToken,
  verifyChangePasswordCredentials,
  submitChangePassword,
  createOrganization,
  joinOrganization,
  checkVerificationStatus,
  checkEmailAvailability
};
