const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateOtp, generateReferralCode } = require('../utils/helpers');
const { sendOtpEmail } = require('../services/emailService');

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
      referralCode,
      role
    } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const effectiveFirstName = (firstName || fname || '').trim();
    const effectiveLastName = (lastName || lname || '').trim();
    const effectivePassword = (password || '').trim();
    const effectivePhone = (phone || '').trim() || null;
    const isEmp = isEmployee === true || isEmployee === 'true' || accountType === 'employee' || !!orgName || !!referralCode;
    const effectiveAccountType = isEmp ? 'employee' : 'normal_user';
    const effectiveRole = isEmp ? (role === 'normal' ? 'hr' : (role || 'hr')) : 'normal_user';

    // Strict Email Validation
    const emailValidation = validateEmailAddress(normalizedEmail, isEmp);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.message,
        message: emailValidation.message
      });
    }

    if (!effectiveFirstName) {
      return res.status(400).json({
        success: false,
        error: 'First name is required.',
        message: 'First name is required.'
      });
    }

    if (!effectivePassword) {
      return res.status(400).json({
        success: false,
        error: 'Password is required.',
        message: 'Password is required.'
      });
    }

    if (effectivePassword.length < 6) {
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
          const errText = isEmp
            ? '❌ You must be at least 18 years old to register as a company employee.'
            : '❌ You must be at least 15 years old to register.';
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
          const errText = isEmp
            ? '❌ You must be at least 18 years old to register as a company employee.'
            : '❌ You must be at least 15 years old to register.';
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
    if (orgName && !assignedOrgId) {
      const newOrg = await prisma.organization.create({
        data: {
          name: orgName.trim(),
          adminId: newUser.id
        }
      });

      await prisma.user.update({
        where: { id: newUser.id },
        data: { organizationId: newOrg.id, role: 'admin' }
      });
    }

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
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
        message: 'Invalid credentials. User not found.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.',
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.'
      });
    }

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

    // Send real verification email directly to user's entered email address
    sendOtpEmail(recipientEmail, otpCode, type).catch(err => {
      console.warn('Background OTP email dispatch:', err.message);
    });

    return res.json({
      success: true,
      message: `Verification code dispatched to ${recipientEmail}.`,
      previewOtp: otpCode
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

    return res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP.', message: 'Failed to verify OTP.' });
  }
}

/**
 * Forgot Password - Send Reset OTP
 */
async function forgotPassword(req, res) {
  req.body.type = 'password_reset';
  return sendOtp(req, res);
}

/**
 * Reset Password with Verified OTP
 */
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required.', message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.', message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account registered with this email address.', message: 'No account registered with this email address.' });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        otp: otp.trim(),
        type: 'password_reset',
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP session. Please request a new code.', message: 'Invalid or expired OTP session.' });
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

    return res.json({
      success: true,
      message: '🎉 Password reset successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password: ' + (error.message || 'Server error'), message: 'Failed to reset password.' });
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
  createOrganization,
  joinOrganization
};
