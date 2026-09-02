const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateOtp, generateReferralCode } = require('../utils/helpers');
const { sendOTPEmail, sendOtpEmail } = require('../services/emailService');
const { recordAuthFailure, resetAuthFailure } = require('../middleware/authRateLimit');

/**
 * Validate Email Format, Domain Structure, and Gmail Requirement
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

  // Candidate signup: Strict Gmail validation
  if (!isEmployee) {
    if (domain !== 'gmail.com') {
      return { valid: false, message: '⚠️ Only Gmail addresses are allowed. Please use @gmail.com.' };
    }
  }

  return { valid: true, email: clean };
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
    if (!emailValidation.valid) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({
        success: false,
        error: emailValidation.message,
        message: emailValidation.message
      });
    }

    if (!effectiveFirstName) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'First name is required.',
        message: 'First name is required.'
      });
    }

    if (!effectivePassword) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Password is required.',
        message: 'Password is required.'
      });
    }

    if (effectivePassword.length < 6) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please log in.',
        message: 'An account with this email already exists. Please log in.'
      });
    }

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
        recordAuthFailure(req, normalizedEmail);
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired organization referral code.',
          message: 'Invalid or expired organization referral code.'
        });
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
          recordAuthFailure(req, normalizedEmail);
          const errText = isEmp ? '❌ You must be at least 18 years old to register as a company employee.' : '❌ You must be at least 15 years old to register.';
          return res.status(400).json({
            success: false,
            error: errText,
            message: errText
          });
        }
        parsedDob = birthDate;
        parsedAge = calculatedAge;
      }
    } else if (age) {
      const a = parseInt(age, 10);
      if (!isNaN(a)) {
        if (a < minRequiredAge) {
          recordAuthFailure(req, normalizedEmail);
          const errText = isEmp ? '❌ You must be at least 18 years old to register as a company employee.' : '❌ You must be at least 15 years old to register.';
          return res.status(400).json({
            success: false,
            error: errText,
            message: errText
          });
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
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: effectiveFirstName,
        lastName: effectiveLastName || null,
        username: candidateUsername,
        phone: safePhone,
        accountType: effectiveAccountType,
        role: assignedOrgId ? assignedRole : (orgName ? 'admin' : (effectiveAccountType === 'employee' ? assignedRole : 'normal_user')),
        profession: profession || (isEmp ? assignedRole : null),
        linkedInUrl: linkedInUrl || null,
        age: parsedAge,
        dob: parsedDob,
        gender: gender || null,
        status: 'active',
        isEmailVerified: true, // Mark verified on registration
        isPhoneVerified: true,
        organizationId: assignedOrgId
      }
    });

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

    // Reset any auth failure backoff upon successful registration
    resetAuthFailure(req, normalizedEmail);

    // Establish Express Session
    req.session.userId = newUser.id;

    // Fetch full user with organization
    const createdUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { organization: true }
    });

    const { password: _, ...userSafe } = createdUser;

    // Attach frontend compatibility aliases
    const responseUser = {
      ...userSafe,
      fname: userSafe.firstName,
      lname: userSafe.lastName || '',
      isEmployee: userSafe.accountType === 'employee',
      verified: { email: true, phone: true },
      resumes: [],
      matches: 0,
      theme: 'light'
    };

    req.session.save((err) => {
      if (err) console.error('Session save error on register:', err);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        user: responseUser,
        token: req.sessionID || `session_${newUser.id}`
      });
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

    if (!searchId || !cleanPassword) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: 'Please enter your email/username and password.',
        message: 'Please enter your email/username and password.'
      });
    }

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

    if (!user) {
      recordAuthFailure(req, searchId);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
        message: 'Invalid credentials. User not found.'
      });
    }

    if (user.status === 'suspended') {
      recordAuthFailure(req, searchId);
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.',
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    if (!isPasswordValid) {
      recordAuthFailure(req, searchId);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.'
      });
    }

    // Reset failure backoff upon successful credentials check
    resetAuthFailure(req, searchId);
    if (user.email) resetAuthFailure(req, user.email);

    // Establish Express Session
    req.session.userId = user.id;

    req.session.save((err) => {
      if (err) {
        console.error('Session Save Error:', err);
      }

      const { password: _, ...userSafe } = user;
      const responseUser = {
        ...userSafe,
        fname: userSafe.firstName,
        lname: userSafe.lastName || '',
        isEmployee: userSafe.accountType === 'employee',
        verified: { email: userSafe.isEmailVerified, phone: userSafe.isPhoneVerified },
        resumes: [],
        matches: 0,
        theme: 'light'
      };

      return res.json({
        success: true,
        message: 'Login successful.',
        user: responseUser,
        token: req.sessionID || `session_${user.id}`
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
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  });
}

/**
 * Get Current Authenticated User (Session Context)
 */
async function getMe(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        user: null,
        error: 'Not logged in',
        message: 'Not logged in'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { organization: true }
    });

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ success: false, user: null, error: 'User not found', message: 'User not found' });
    }

    const { password: _, ...userSafe } = user;
    const responseUser = {
      ...userSafe,
      fname: userSafe.firstName,
      lname: userSafe.lastName || '',
      isEmployee: userSafe.accountType === 'employee',
      verified: { email: userSafe.isEmailVerified, phone: userSafe.isPhoneVerified },
      resumes: [],
      matches: 0,
      theme: 'light'
    };

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
    const recipientEmail = (email || identifier || to || workEmail || corporateEmail || '').toLowerCase().trim();

    const isEmp = isEmployee === true || isEmployee === 'true' || type === 'corporate_email_verification';
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

    // Cooldown check (20s) to prevent spamming Google SMTP server
    const recentOtp = await prisma.oTP.findFirst({
      where: {
        email: recipientEmail,
        createdAt: { gte: new Date(Date.now() - 20 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (recentOtp) {
      return res.status(429).json({
        success: false,
        error: 'Please wait 20 seconds before requesting another code.',
        message: 'Please wait 20 seconds before requesting another code.'
      });
    }

    await prisma.oTP.updateMany({
      where: { email: recipientEmail, isUsed: false },
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

    // Send real verification email directly to user's entered email address (No dummy fallback, no console.log)
    const emailSent = await sendOTPEmail(recipientEmail, otpCode, type);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again later.',
        message: 'Failed to send OTP email. Please try again later.'
      });
    }

    return res.json({
      success: true,
      message: `Verification code sent to ${recipientEmail}. Please check your Gmail Inbox, Updates or Spam folder.`
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

    if (!recipientEmail || !otp) {
      recordAuthFailure(req, recipientEmail);
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.', message: 'Email and OTP code are required.' });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: recipientEmail,
        otp: otp.trim(),
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      recordAuthFailure(req, recipientEmail);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code.',
        message: 'Invalid or expired OTP code.'
      });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    if (type === 'email_verification') {
      await prisma.user.updateMany({
        where: { email: recipientEmail },
        data: { isEmailVerified: true }
      });
    }

    // Reset backoff counter on successful OTP verification
    resetAuthFailure(req, recipientEmail);

    return res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.'
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

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
        message: 'Email address is required.'
      });
    }

    const emailValidation = validateEmailAddress(recipientEmail, false);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.message,
        message: emailValidation.message
      });
    }

    // Check if user is registered in the web application
    const user = await prisma.user.findUnique({
      where: { email: recipientEmail }
    });

    if (!user) {
      recordAuthFailure(req, recipientEmail);
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address. Please check the email or sign up.',
        message: 'No account found with this email address. Please check the email or sign up.'
      });
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

    // Send real verification / reset code email
    const emailSent = await sendOTPEmail(recipientEmail, otpCode, 'password_reset');
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again later.',
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

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

    if (!normalizedEmail || !otp || !newPassword) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({ success: false, error: 'Email, OTP code, and new password are required.', message: 'Email, OTP code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.', message: 'Password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(404).json({ success: false, error: 'No account registered with this email address.', message: 'No account registered with this email address.' });
    }

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

    if (!otpRecord) {
      recordAuthFailure(req, normalizedEmail);
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP session. Please request a new code.', message: 'Invalid or expired OTP session. Please request a new code.' });
    }

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
 * Verify Referral Code (Company Portal Validation Helper)
 */
async function verifyCompanyReferral(req, res) {
  try {
    const { referralCode } = req.body;
    if (!referralCode || !referralCode.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required.',
        message: 'Referral code is required.'
      });
    }

    const cleanCode = referralCode.toUpperCase().trim();
    const referralRecord = await prisma.referralCode.findUnique({
      where: { code: cleanCode },
      include: { organization: true }
    });

    if (!referralRecord) {
      recordAuthFailure(req);
      return res.status(400).json({
        success: false,
        error: '❌ Invalid referral code. Password reset attempt denied.',
        message: '❌ Invalid referral code. Password reset attempt denied.'
      });
    }

    if (referralRecord.expiresAt < new Date()) {
      recordAuthFailure(req);
      return res.status(400).json({
        success: false,
        error: '❌ Referral code has expired. Password reset attempt denied.',
        message: '❌ Referral code has expired. Password reset attempt denied.'
      });
    }

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

    if (!searchId) {
      recordAuthFailure(req);
      return res.status(400).json({
        success: false,
        error: 'Corporate email or work username is required.',
        message: 'Corporate email or work username is required.'
      });
    }

    if (!cleanReferral) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: 'Referral code is required to initiate Company Portal password reset.',
        message: 'Referral code is required to initiate Company Portal password reset.'
      });
    }

    if (!cleanNewPassword) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: 'New password is required.',
        message: 'New password is required.'
      });
    }

    if (cleanNewPassword.length < 6) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
        message: 'Password must be at least 6 characters long.'
      });
    }

    // 1. Verify Referral Code in Database
    const referralRecord = await prisma.referralCode.findUnique({
      where: { code: cleanReferral },
      include: { organization: true }
    });

    if (!referralRecord) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: '❌ Invalid referral code. Password reset attempt denied.',
        message: '❌ Invalid referral code. Password reset attempt denied.'
      });
    }

    if (referralRecord.expiresAt < new Date()) {
      recordAuthFailure(req, searchId);
      return res.status(400).json({
        success: false,
        error: '❌ Referral code has expired. Password reset attempt denied.',
        message: '❌ Referral code has expired. Password reset attempt denied.'
      });
    }

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

    if (!user) {
      recordAuthFailure(req, searchId);
      return res.status(404).json({
        success: false,
        error: '❌ No organization account found with this corporate email/username.',
        message: '❌ No organization account found with this corporate email/username.'
      });
    }

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

module.exports = {
  register,
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
  createOrganization,
  joinOrganization
};

