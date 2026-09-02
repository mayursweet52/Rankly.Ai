const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: isSecure,
    auth: {
        user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
        pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
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

    // 1. Tier 1: Nodemailer Direct SMTP (Port 465 SSL via smtp.gmail.com) - Primary Real Delivery
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Connection timeout')), 7000))
        ]);
        console.log('✅ Email delivered via Direct Gmail SMTP to:', cleanRecipient, 'MessageId:', info?.messageId);
        return { success: true, method: 'smtp', messageId: info?.messageId || 'OK' };
    } catch (smtpErr) {
        console.warn('⚠️ [Direct SMTP Warning]:', smtpErr.message, 'Trying backup tiers...');
    }

    // 2. Tier 2: Official Google Webhook (Port 443 HTTPS REST Backup)
    const googleWebhookUrl = (process.env.GOOGLE_MAIL_WEBHOOK_URL || '').trim();
    if (googleWebhookUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(googleWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    to: cleanRecipient,
                    subject: subject,
                    html: html
                })
            });
            clearTimeout(timeoutId);
            const resData = await res.json();
            if (resData && resData.success) {
                console.log('✅ Email delivered via Google Webhook (HTTPS 443) to:', cleanRecipient);
                return { success: true, method: 'google_webhook', message: 'Delivered via Google Cloud HTTPS Webhook' };
            }
        } catch (gErr) {
            console.warn('[Google Webhook Warning]:', gErr.message);
        }
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
            console.warn('[Resend API Error]:', apiErr.message);
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
    const subject = isReset ? `Rankly.ai Password Reset Code: ${otp}` : `Your Rankly.ai Verification Code: ${otp}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; padding: 40px; margin: 0; }
            .container { max-width: 520px; margin: auto; background: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-top: 6px solid #4f46e5; }
            .logo { font-size: 28px; font-weight: 800; color: #4f46e5; text-align: center; }
            .tagline { text-align: center; color: #6b7280; font-size: 14px; margin-top: 4px; }
            .greeting { color: #1e293b; font-size: 16px; margin: 20px 0 10px; }
            .otp-box { background: #f0f4ff; padding: 16px; text-align: center; font-size: 36px; font-weight: 700; letter-spacing: 8px; border-radius: 12px; margin: 20px 0; color: #1e293b; border: 1px dashed #c7d2fe; font-family: monospace; }
            .validity { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 24px; }
            .brand-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 24px; }
            .brand-box h4 { margin: 0; color: #4f46e5; font-size: 14px; }
            .brand-box p { margin: 6px 0 0; color: #475569; font-size: 14px; }
            .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
            .footer a { color: #4f46e5; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🚀 Rankly.ai</div>
            <div class="tagline">AI-Powered Recruitment Platform</div>

            <div class="greeting">Hi <strong style="color: #111111;">${cleanRecipient}</strong>,</div>
            <p style="color: #1e293b; font-size: 16px;">${isReset ? 'Your password reset code is:' : 'Your one-time verification code is:'}</p>

            <div class="otp-box">${otp}</div>

            <div class="validity">⏳ This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</div>

            <div class="brand-box">
                <h4>💡 Hire Smarter, Faster & Fairer</h4>
                <p>Rankly.ai helps you screen resumes, manage pipelines, and make data-driven hiring decisions.</p>
            </div>

            <div class="footer">
                <p>© 2026 Rankly.ai — All rights reserved.</p>
                <p><a href="https://rankly-ai-production.up.railway.app">rankly-ai-production.up.railway.app</a> &bull; <a href="https://rankly-ai-production.up.railway.app/privacy">Privacy Policy</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const res = await sendSystemEmail({
        to: cleanRecipient,
        subject,
        html,
        text: `Hi ${cleanRecipient},\n\nYour Rankly.ai verification code is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nBest regards,\nRankly.ai Security`
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
