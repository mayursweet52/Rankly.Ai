const nodemailer = require('nodemailer');

/**
 * Send OTP Verification Email
 */
async function sendOtpEmail(toEmail, otpCode, type = 'email_verification') {
  if (!toEmail) {
    throw new Error('Recipient email address (toEmail) is required.');
  }

  const cleanRecipient = toEmail.toString().toLowerCase().trim();
  const isReset = type === 'password_reset';
  const subject = isReset 
    ? `Rankly.ai Password Reset Code: ${otpCode}` 
    : `Rankly.ai Verification Code: ${otpCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rankly.ai Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 10px; margin: 0;">
  <div style="max-width: 460px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-top: 4px solid #111111;">
    
    <!-- Brand Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #111111; margin: 0; font-size: 22px; font-weight: 800;">Rankly.ai</h2>
      <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">AI-Powered Recruitment Intelligence</p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />

    <!-- Greeting & Message -->
    <p style="color: #1e293b; font-size: 14px; margin: 16px 0 8px 0;">Hi <strong style="color: #111111;">${cleanRecipient}</strong>,</p>
    <p style="color: #1e293b; font-size: 14px; margin: 0 0 16px 0;">
      ${isReset ? 'Your password reset code for Rankly.ai is:' : 'Your one-time email verification code (OTP) for Rankly.ai is:'}
    </p>

    <!-- OTP Display Box -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; border-radius: 8px; margin: 20px 0; color: #0f172a; font-family: monospace;">
      ${otpCode}
    </div>

    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0 0 20px 0;">
      This code is valid for <strong>10 minutes</strong>. For security, please do not share it with anyone.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 16px 0;" />

    <!-- Footer -->
    <div style="text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} Rankly.ai Inc. All rights reserved.</p>
      <p style="margin: 0;">Automated notification sent to ${cleanRecipient}</p>
    </div>

  </div>
</body>
</html>
  `;

  const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
  const fromAddress = `"Rankly.ai Security" <${senderUser}>`;

  const mailOptions = {
    from: fromAddress,
    to: cleanRecipient,
    subject,
    text: `Hi ${cleanRecipient},\n\nYour Rankly.ai verification code is: ${otpCode}\n\nThis OTP is valid for 10 minutes.\n\nBest regards,\nRankly.ai Security`,
    html
  };

  // Try Port 587 with STARTTLS first, then Port 465 SSL
  try {
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: senderUser,
        pass: (process.env.SMTP_PASS || 'fhlowstsbxdhowsq').replace(/\s+/g, '').trim()
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
      tls: { rejectUnauthorized: false }
    });

    const info = await Promise.race([
      transporter587.sendMail(mailOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Port 587 timeout')), 4500))
    ]);

    console.log('✅ Real OTP email delivered to:', cleanRecipient, 'MessageId:', info?.messageId || 'OK');
    return true;
  } catch (err587) {
    console.warn('[SMTP Port 587 Attempt Failed]:', err587.message, '- Trying Port 465...');
    
    try {
      const transporter465 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: senderUser,
          pass: (process.env.SMTP_PASS || 'fhlowstsbxdhowsq').replace(/\s+/g, '').trim()
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        tls: { rejectUnauthorized: false }
      });

      const info465 = await Promise.race([
        transporter465.sendMail(mailOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Port 465 timeout')), 4500))
      ]);

      console.log('✅ Real OTP email delivered via Port 465 to:', cleanRecipient, 'MessageId:', info465?.messageId || 'OK');
      return true;
    } catch (err465) {
      console.warn(`[SMTP Warning] Network/Firewall blocked direct SMTP delivery (${err465.message}). OTP stored in database for ${cleanRecipient}: ${otpCode}`);
      return false;
    }
  }
}

/**
 * Send Team Invitation Email
 */
async function sendInvitationEmail(toEmail, organizationName, role, inviteUrl) {
  const cleanRecipient = (toEmail || '').toString().toLowerCase().trim();
  const subject = `🚀 You're invited to join ${organizationName} on Rankly.ai`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin: 0 0 16px 0;">Rankly.ai Team Invitation</h2>
      <p style="color: #334155; font-size: 15px;">
        You have been invited to join <strong>${organizationName}</strong> as a <strong>${role.toUpperCase()}</strong> on Rankly.ai.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
          Accept Invitation & Join Team
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Or copy and paste this link in your browser: <br/><a href="${inviteUrl}" style="color: #4f46e5;">${inviteUrl}</a></p>
    </div>
  `;

  const transporter = getTransporter();
  return await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `Rankly.ai <${process.env.SMTP_USER}>`,
    to: cleanRecipient,
    subject,
    html
  });
}

/**
 * Send Candidate Status Update Notification
 */
async function sendCandidateStatusNotification(toEmail, candidateName, targetRole, stage, customMessage = '') {
  const cleanRecipient = (toEmail || '').toString().toLowerCase().trim();
  const stageLabels = {
    applied: 'Application Received',
    ai_screened: 'AI Screening Completed',
    hm_review: 'Hiring Manager Review',
    interview: 'Interview Scheduled',
    offered: 'Job Offer Extended',
    rejected: 'Application Status Update'
  };

  const subject = `Update regarding your application for ${targetRole} at Rankly.ai`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin: 0 0 16px 0;">Application Update</h2>
      <p style="color: #334155; font-size: 15px;">Hello ${candidateName},</p>
      <p style="color: #334155; font-size: 15px;">
        Your application status for <strong>${targetRole}</strong> has moved to: 
        <span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 600;">
          ${stageLabels[stage] || stage}
        </span>
      </p>
      ${customMessage ? `<div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px; margin: 20px 0; color: #475569;">${customMessage}</div>` : ''}
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Thank you for your interest in joining our team!</p>
    </div>
  `;

  const transporter = getTransporter();
  return await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `Rankly.ai <${process.env.SMTP_USER}>`,
    to: cleanRecipient,
    subject,
    html
  });
}

module.exports = {
  sendOtpEmail,
  sendOTPEmail: sendOtpEmail,
  sendInvitationEmail,
  sendCandidateStatusNotification
};
