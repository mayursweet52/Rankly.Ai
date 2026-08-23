const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
        pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    tls: { rejectUnauthorized: false }
});

/**
 * Send OTP Verification Email with Professional HTML Template
 */
async function sendOTPEmail(to, otp, type = 'email_verification') {
    if (!to) return false;
    const cleanRecipient = to.toString().toLowerCase().trim();
    const isReset = type === 'password_reset';
    const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
    const fromAddress = process.env.SMTP_FROM || `"Rankly.ai" <${senderUser}>`;
    const subject = isReset ? '🔐 Your Rankly.ai Password Reset Code' : '🔐 Your Rankly.ai OTP Code';

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
            .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px; }
            .footer a { color: #4f46e5; text-decoration: none; }
            .brand-box { background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 20px; border: 1px solid #e2e8f0; text-align: center; }
            .brand-box h4 { margin: 0; color: #0f172a; font-size: 16px; }
            .brand-box p { margin: 6px 0 0; color: #475569; font-size: 14px; }
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
                <p><a href="https://rankly-ai-production.up.railway.app">rankly-ai-production.up.railway.app</a> &bull; <a href="#">Privacy Policy</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: fromAddress,
        to: cleanRecipient,
        subject: subject,
        text: `Hi ${cleanRecipient},\n\nYour Rankly.ai verification code is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nBest regards,\nRankly.ai Security`,
        html: html,
        headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
        }
    };

    // 1. Try Official Google Apps Script Webhook (Port 443 - 100% Free, sends from rankly.ai.com@gmail.com to ANY recipient!)
    const googleWebhookUrl = (process.env.GOOGLE_MAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzdtsKRpIqXcAa17Fz2OTe5WS0JmgaCkLdQC_-Va_r0VHgoMNBhdXDHQlBgFvxCJ8VO/exec').trim();
    if (googleWebhookUrl) {
        try {
            const res = await fetch(googleWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: cleanRecipient,
                    subject: subject,
                    html: html,
                    otp: otp
                })
            });
            const resData = await res.json();
            if (resData && resData.success) {
                console.log('✅ Real OTP email delivered via Official Google Webhook to:', cleanRecipient);
                return true;
            }
        } catch (gErr) {
            console.warn('[Google Webhook Dispatch Warning]:', gErr.message);
        }
    }

    // 2. Try Resend HTTPS REST API (Port 443)
    const resendApiKey = (process.env.RESEND_API_KEY || 're_drUT68w4_FG6j2TXTaq3qT61MuHBdniXW').trim();
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
                console.log('✅ Real OTP email delivered via Resend API to:', cleanRecipient, 'ID:', resData.id);
                return true;
            }
        } catch (apiErr) {
            console.warn('[Resend API Error]:', apiErr.message);
        }
    }

    // 3. Try Brevo HTTPS REST API (Port 443)
    if (process.env.BREVO_API_KEY) {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': process.env.BREVO_API_KEY.trim(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: 'Rankly.ai', email: senderUser },
                    to: [{ email: cleanRecipient }],
                    subject: subject,
                    htmlContent: html
                })
            });
            const resData = await res.json();
            if (res.ok && (resData.messageId || resData.id)) {
                console.log('✅ Real OTP email delivered via Brevo API to:', cleanRecipient, 'ID:', resData.messageId || resData.id);
                return true;
            }
        } catch (brevoErr) {
            console.warn('[Brevo API Error]:', brevoErr.message);
        }
    }

    // 3. Try Gmail Transporter
    try {
        const info = await Promise.race([
            transporter.sendMail(mailOptions),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Gmail SMTP timeout')), 4000))
        ]);
        console.log('✅ OTP sent to:', cleanRecipient, 'MessageId:', info?.messageId || 'OK');
        return true;
    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        return false;
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

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `Rankly.ai <${process.env.SMTP_USER}>`,
      to: cleanRecipient,
      subject,
      html
    });
  } catch (err) {
    console.error('Invite email error:', err.message);
    return null;
  }
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

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `Rankly.ai <${process.env.SMTP_USER}>`,
      to: cleanRecipient,
      subject,
      html
    });
  } catch (err) {
    console.error('Status notification email error:', err.message);
    return null;
  }
}

module.exports = {
  sendOTPEmail,
  sendOtpEmail: sendOTPEmail,
  sendInvitationEmail,
  sendCandidateStatusNotification
};
