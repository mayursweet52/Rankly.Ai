const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 200,
    rateDelta: 1000,
    rateLimit: 5,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: isSecure,
    auth: {
        user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
        pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false }
});

/**
 * Universal Multi-Tier System Email Sender (Resilient to cloud SMTP timeouts)
 */
async function sendSystemEmail({ to, subject, html, text }) {
    if (!to) return { success: false, message: 'Recipient is required' };
    const cleanRecipient = to.toString().toLowerCase().trim();
    const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
    const fromAddress = process.env.SMTP_FROM || `"Rankly.ai" <${senderUser}>`;

    // 1. Tier 1: Direct Nodemailer SMTP (Port 465 SSL via smtp.gmail.com - rankly.ai.com@gmail.com)
    try {
        const info = await Promise.race([
            transporter.sendMail({
                from: fromAddress,
                replyTo: senderUser,
                to: cleanRecipient,
                subject: subject,
                text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
                html: html
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Connection timeout')), 4000))
        ]);
        console.log("✅ E-mail Successfully Bhej Diya Gaya:", info?.response || info?.messageId || 'OK');
        return { success: true, method: 'smtp', messageId: info?.messageId || 'OK' };
    } catch (smtpErr) {
        console.error("❌ E-mail Bhejne Mein Error Aaya:", smtpErr);
    }


    // 3. Tier 3: Resend REST API (Port 443 HTTPS Backup)
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendApiKey) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.RESEND_FROM || 'Rankly.ai <onboarding@resend.dev>',
                    to: [cleanRecipient],
                    subject: subject,
                    html: html
                })
            });
            const resData = await res.json();
            if (res.ok && resData.id) {
                console.log('✅ Email delivered via Resend API (HTTPS 443) to:', cleanRecipient, 'ID:', resData.id);
                return { success: true, method: 'resend', messageId: resData.id };
            }
        } catch (apiErr) {
            console.warn('[Resend API Warning]:', apiErr.message);
        }
    }

    console.error('❌ All email delivery tiers failed for:', cleanRecipient);
    return { success: false, message: 'All email delivery tiers failed' };
}

/**
 * Send OTP Verification Email with Professional HTML Template
 */
async function sendOTPEmail(to, otp, type = 'email_verification') {
    if (!to) return false;
    const cleanRecipient = to.toString().toLowerCase().trim();
    const isReset = type === 'password_reset';
    const subject = isReset ? `Rankly.ai: ${otp} is your password reset code` : `Rankly.ai: ${otp} is your verification code`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; color: #333333;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e6ebf1; padding: 32px;">
            <tr>
                <td style="text-align: left; padding-bottom: 20px;">
                    <span style="font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">Rankly.ai</span>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 16px; font-size: 15px; line-height: 24px; color: #374151;">
                    Hello,
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 24px; font-size: 15px; line-height: 24px; color: #374151;">
                    ${isReset ? 'Use the following one-time code to reset your Rankly.ai password:' : 'Use the following one-time code to verify your email address on Rankly.ai:'}
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 24px;">
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; font-family: monospace;">
                        ${otp}
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 24px; font-size: 13px; line-height: 20px; color: #6b7280;">
                    This code is valid for <strong>10 minutes</strong>. If you did not request this verification code, please disregard this email.
                </td>
            </tr>
            <tr>
                <td style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; line-height: 18px;">
                    Rankly.ai Security Team<br/>
                    Automated security notification — do not reply directly.
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const text = `Rankly.ai Verification Code\n\nHello,\n\nYour one-time verification code is: ${otp}\n\nThis code is valid for 10 minutes.\nIf you did not request this code, you can safely ignore this email.\n\nRankly.ai Security Team`;

    const res = await sendSystemEmail({
        to: cleanRecipient,
        subject,
        html,
        text
    });

    return res.success;
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

    const res = await sendSystemEmail({ to: cleanRecipient, subject, html });
    return res.success;
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

    const res = await sendSystemEmail({ to: cleanRecipient, subject, html });
    return res.success;
}

module.exports = {
    sendSystemEmail,
    sendOTPEmail,
    sendInvitationEmail,
    sendCandidateStatusNotification
};
