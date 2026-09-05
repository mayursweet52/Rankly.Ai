const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const { generateReferralCode } = require('../utils/helpers');
const { sendInvitationEmail } = require('../services/emailService');

/**
 * Get User Profile
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organization: {
          include: {
            members: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password, ...userSafe } = user;
    return res.json({ success: true, user: userSafe });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

/**
 * Update User Profile
 */
async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone, profession, linkedInUrl, dob, age, gender, username } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName !== undefined ? firstName.trim() : undefined,
        lastName: lastName !== undefined ? lastName.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        profession: profession !== undefined ? profession.trim() : undefined,
        linkedInUrl: linkedInUrl !== undefined ? linkedInUrl.trim() : undefined,
        username: username !== undefined ? username.trim() : undefined,
        age: age !== undefined ? parseInt(age, 10) : undefined,
        dob: dob !== undefined ? new Date(dob) : undefined,
        gender: gender !== undefined ? gender : undefined
      }
    });

    const { password, ...userSafe } = updatedUser;
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: userSafe
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

/**
 * Update User Email
 */
async function updateEmail(req, res) {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ success: false, message: 'New email is required.' });
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ success: false, message: 'This email is already in use.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { email: normalizedEmail, isEmailVerified: false }
    });

    const { password, ...userSafe } = updated;
    return res.json({
      success: true,
      message: 'Email updated successfully. Please verify your new email address.',
      user: userSafe
    });
  } catch (error) {
    console.error('Update Email Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update email.' });
  }
}

/**
 * Change Password
 */
async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

/**
 * Delete User Account
 */
async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Clean up dependent child records
    await prisma.referralCode.deleteMany({ where: { createdById: userId } }).catch(() => {});
    await prisma.chatMessage.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.evaluation.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.candidate.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.grievance.deleteMany({ where: { userId } }).catch(() => {});
    if (userEmail) {
      await prisma.oTP.deleteMany({ where: { email: userEmail } }).catch(() => {});
    }
    await prisma.organization.deleteMany({ where: { adminId: userId } }).catch(() => {});

    await prisma.user.delete({ where: { id: userId } });

    if (req.logout) {
      try { req.logout(() => {}); } catch (e) {}
    }

    if (req.session) {
      req.session.destroy();
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.clearCookie('token', { path: '/' });
    res.clearCookie('jwt', { path: '/' });
    res.clearCookie('rankly_session', { path: '/' });

    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
}

/**
 * Create Team Referral Code (Admin / HR)
 */
async function createReferralCode(req, res) {
  try {
    const { assignedRole = 'hr', maxUses = 5, expiresInDays = 30 } = req.body;

    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'You must belong to an organization to generate referral codes.' });
    }

    const code = generateReferralCode('RNK');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const referral = await prisma.referralCode.create({
      data: {
        code,
        organizationId: req.user.organizationId,
        createdById: req.user.id,
        assignedRole: assignedRole.toLowerCase(),
        maxUses: parseInt(maxUses, 10) || 5,
        expiresAt
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Referral code generated successfully.',
      referral
    });
  } catch (error) {
    console.error('Create Referral Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create referral code.' });
  }
}

/**
 * List Organization Referral Codes
 */
async function getReferralCodes(req, res) {
  try {
    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'No organization attached to user.' });
    }

    const referrals = await prisma.referralCode.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, referrals });
  } catch (error) {
    console.error('Get Referrals Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch referral codes.' });
  }
}

/**
 * Invite Team Member via Email
 */
async function inviteTeamMember(req, res) {
  try {
    const { email, role = 'hr' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Invitee email is required.' });
    }

    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'Admin must belong to an organization.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days;

    const invitation = await prisma.teamInvitation.create({
      data: {
        organizationId: req.user.organizationId,
        email: normalizedEmail,
        role: role.toLowerCase(),
        token,
        expiresAt
      },
      include: { organization: true }
    });

    const appUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/?invite=${token}`;

    await sendInvitationEmail(normalizedEmail, invitation.organization.name, role, inviteUrl);

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${normalizedEmail}.`,
      invitation
    });
  } catch (error) {
    console.error('Invite Team Member Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invitation.' });
  }
}

/**
 * Get Team Members & Invitations
 */
async function getTeamMembers(req, res) {
  try {
    if (!req.user.organizationId) {
      return res.status(400).json({ success: false, message: 'No organization attached.' });
    }

    const members = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        profession: true,
        createdAt: true
      }
    });

    const invitations = await prisma.teamInvitation.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      members,
      invitations
    });
  } catch (error) {
    console.error('Get Team Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch team data.' });
  }
}

/**
 * Approve or Reject Pending Employee
 */
async function updateMemberStatus(req, res) {
  try {
    const { userId, status } = req.body; // status: 'active' | 'suspended' | 'rejected';

    if (!userId || !status) {
      return res.status(400).json({ success: false, message: 'User ID and status are required.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.organizationId !== req.user.organizationId) {
      return res.status(404).json({ success: false, message: 'User not found in your organization.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status }
    });

    return res.json({
      success: true,
      message: `Member status updated to ${status}.`,
      user: { id: updated.id, status: updated.status }
    });
  } catch (error) {
    console.error('Update Member Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update member status.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteAccount,
  createReferralCode,
  getReferralCodes,
  inviteTeamMember,
  getTeamMembers,
  updateMemberStatus
};
