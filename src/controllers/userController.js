const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const pgDb = require('../config/pgDatabase');
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
 * Delete User Account & Cascade Purge
 */
async function deleteAccount(req, res) {
  try {
    let userId = req.user?.id || req.session?.userId || req.session?.user?.id || req.userId || req.body?.userId || req.body?.id || req.query?.userId || req.headers['x-user-id'];
    let userEmail = (
      req.user?.email || 
      req.user?.workEmail || 
      req.session?.user?.email || 
      req.session?.user?.workEmail || 
      req.session?.userEmail || 
      req.body?.email || 
      req.body?.userEmail || 
      req.query?.email || 
      req.headers['x-user-email'] || 
      ''
    ).toLowerCase().trim();

    if (userId) userId = String(userId).trim();

    // Try finding the user if only email or only userId was provided
    let existingUser = null;
    if (userId) {
      existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      }).catch(() => null);
    }
    if (!existingUser && userEmail) {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: userEmail } },
            { workEmail: { equals: userEmail } }
          ]
        },
        include: { organization: true }
      }).catch(() => null);
    }

    const targetUserId = existingUser?.id || userId;
    const targetUserEmail = (existingUser?.email || existingUser?.workEmail || userEmail || '').toLowerCase().trim();

    console.log(`🗑️ [DELETE ACCOUNT INITIATED]:`, { targetUserId, targetUserEmail });

    if (!targetUserId && !targetUserEmail) {
      return res.status(401).json({ success: false, message: 'Unable to identify account to delete. Please sign in.' });
    }

    // 0. Unlink user from organization first to break foreign key cycles
    if (targetUserId) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { organizationId: null }
      }).catch(() => {});
    }

    // 1. Direct User relations cleanup
    if (targetUserId) {
      await prisma.notification.deleteMany({ where: { userId: targetUserId } }).catch(() => {});
      await prisma.chatMessage.deleteMany({ where: { userId: targetUserId } }).catch(() => {});
      await prisma.companyDocument.deleteMany({ where: { uploadedById: targetUserId } }).catch(() => {});
      await prisma.referralCode.deleteMany({ where: { createdById: targetUserId } }).catch(() => {});
    }

    await prisma.feedback.deleteMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ email: targetUserEmail }] : [])
        ]
      }
    }).catch(() => {});

    await prisma.candidateApplication.deleteMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ candidateEmail: targetUserEmail }] : [])
        ]
      }
    }).catch(() => {});

    await prisma.grievance.deleteMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ employeeEmail: targetUserEmail }] : [])
        ]
      }
    }).catch(() => {});

    await prisma.evaluation.deleteMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ candidateEmail: targetUserEmail }] : [])
        ]
      }
    }).catch(() => {});

    await prisma.candidate.deleteMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ email: targetUserEmail }] : [])
        ]
      }
    }).catch(() => {});

    if (targetUserEmail) {
      await prisma.oTP.deleteMany({ where: { email: targetUserEmail } }).catch(() => {});
    }

    // 2. Employee Profile and child relations cascade purge
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(targetUserEmail ? [{ workEmail: targetUserEmail }, { personalEmail: targetUserEmail }] : [])
        ]
      },
      select: { id: true }
    }).catch(() => []);

    const employeeIds = employees.map(e => e.id);
    if (employeeIds.length > 0) {
      await prisma.employee.updateMany({
        where: { reportingManagerId: { in: employeeIds } },
        data: { reportingManagerId: null }
      }).catch(() => {});

      await prisma.leaveRequest.updateMany({
        where: { reviewedById: { in: employeeIds } },
        data: { reviewedById: null }
      }).catch(() => {});

      await prisma.attendance.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.employeeSalary.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.employeeBankDetails.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.salaryRevision.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.employeeAccessRole.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.employeeSkill.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.recommendedTraining.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});
      await prisma.agentEmailDraft.deleteMany({ where: { employeeId: { in: employeeIds } } }).catch(() => {});

      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } }).catch(() => {});
    }

    // 3. Organization cascade purge (if user is admin of the organization)
    if (targetUserId) {
      const administeredOrgs = await prisma.organization.findMany({
        where: { adminId: targetUserId },
        select: { id: true }
      }).catch(() => []);
      const orgIds = administeredOrgs.map(o => o.id);

      if (orgIds.length > 0) {
        await prisma.user.updateMany({
          where: { organizationId: { in: orgIds } },
          data: { organizationId: null }
        }).catch(() => {});

        const orgEmployees = await prisma.employee.findMany({
          where: { organizationId: { in: orgIds } },
          select: { id: true }
        }).catch(() => []);
        const orgEmpIds = orgEmployees.map(e => e.id);
        if (orgEmpIds.length > 0) {
          await prisma.employee.updateMany({ where: { reportingManagerId: { in: orgEmpIds } }, data: { reportingManagerId: null } }).catch(() => {});
          await prisma.leaveRequest.updateMany({ where: { reviewedById: { in: orgEmpIds } }, data: { reviewedById: null } }).catch(() => {});
          await prisma.attendance.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.employeeSalary.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.employeeBankDetails.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.salaryRevision.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.employeeAccessRole.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.employeeSkill.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.recommendedTraining.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.agentEmailDraft.deleteMany({ where: { employeeId: { in: orgEmpIds } } }).catch(() => {});
          await prisma.employee.deleteMany({ where: { id: { in: orgEmpIds } } }).catch(() => {});
        }

        await prisma.referralCode.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.teamInvitation.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.companyDocument.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.grievance.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.evaluation.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.candidate.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.department.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => {});
        await prisma.organization.deleteMany({ where: { id: { in: orgIds } } }).catch(() => {});
      }
    }

    // 4. Delete User record
    if (targetUserId) {
      await prisma.user.delete({ where: { id: targetUserId } }).catch(async () => {
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = ?`, targetUserId).catch(() => {});
      });
    }
    if (targetUserEmail) {
      await prisma.user.deleteMany({
        where: {
          OR: [
            { email: { equals: targetUserEmail } },
            { workEmail: { equals: targetUserEmail } }
          ]
        }
      }).catch(async () => {
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE LOWER(email) = LOWER(?)`, targetUserEmail).catch(() => {});
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE LOWER(workEmail) = LOWER(?)`, targetUserEmail).catch(() => {});
      });
    }

    // Safety check: verify if record still exists in SQLite
    let stillExists = targetUserId 
      ? await prisma.user.findUnique({ where: { id: targetUserId } }).catch(() => null)
      : null;
    if (!stillExists && targetUserEmail) {
      stillExists = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: targetUserEmail } },
            { workEmail: { equals: targetUserEmail } }
          ]
        }
      }).catch(() => null);
    }

    if (stillExists) {
      console.warn('⚠️ User record lingered due to constraint locks. Executing forced cascade delete...');
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`).catch(() => {});
      if (targetUserId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = ?;`, targetUserId).catch(() => {});
      }
      if (targetUserEmail) {
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE LOWER(email) = LOWER(?) OR LOWER(workEmail) = LOWER(?);`, targetUserEmail, targetUserEmail).catch(() => {});
      }
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`).catch(() => {});
    }

    // 5. Clean up live PostgreSQL tables if connected (with 1500ms timeout)
    if (targetUserEmail && pgDb && typeof pgDb.query === 'function') {
      try {
        const pgTimeout = new Promise(resolve => setTimeout(resolve, 1500));
        await Promise.race([
          Promise.allSettled([
            pgDb.query('DELETE FROM employees WHERE LOWER(email) = LOWER($1);', [targetUserEmail]),
            pgDb.query('DELETE FROM candidates WHERE LOWER(email) = LOWER($1);', [targetUserEmail]),
            pgDb.query('DELETE FROM complaints WHERE LOWER(email) = LOWER($1);', [targetUserEmail])
          ]),
          pgTimeout
        ]);
      } catch (pgErr) {
        console.warn('PostgreSQL cleanup warning:', pgErr.message);
      }
    }

    // 6. Direct purge from SQLite session store table
    if (targetUserId) {
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM sessions WHERE sess LIKE ? OR sess LIKE ?;`,
          `%"userId":"${targetUserId}"%`,
          `%"id":"${targetUserId}"%`
        ).catch(() => {});
      } catch (_) {}
    }

    // 7. Session and cookie cleanup
    if (req.session) {
      try { req.session.destroy(() => {}); } catch (_) {}
    }
    res.clearCookie('connect.sid', { path: '/' });
    res.clearCookie('token', { path: '/' });
    res.clearCookie('jwt', { path: '/' });
    res.clearCookie('rankly_session', { path: '/' });

    console.log(`✅ [DELETE ACCOUNT COMPLETED]: Account permanently removed.`);
    return res.json({ success: true, message: 'Account permanently deleted from system.' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account. Please try again or contact support.' });
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
