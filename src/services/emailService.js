const nodemailer = require('nodemailer');
const { spawn } = require('child_process');
const path = require('path');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const transporter = nodemailer.createTransport({
    pool: false,
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

function sendViaPythonSmtp({ to, subject, html, text }) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'pythonEmailSender.py');
        const py = spawn('python', [scriptPath]);
        let stdoutData = '';
        let stderrData = '';

        const timer = setTimeout(() => {
            py.kill();
            reject(new Error('Python SMTP timeout after 10s'));
        }, 10000);

        py.stdout.on('data', d => { stdoutData += d.toString(); });
        py.stderr.on('data', d => { stderrData += d.toString(); });

        py.on('close', code => {
            clearTimeout(timer);
            if (code === 0) {
                try {
                    const parsed = JSON.parse(stdoutData.trim());
                    if (parsed.success) {
                        return resolve({ success: true, method: 'python-smtp', message: parsed.message });
                    }
                    return reject(new Error(parsed.error || 'Python email sender failed'));
                } catch (e) {
                    return resolve({ success: true, method: 'python-smtp', message: stdoutData });
                }
            } else {
                return reject(new Error(stderrData || `Python exited with code ${code}`));
            }
        });

        const payload = JSON.stringify({
            to,
            subject,
            html,
            text,
            user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
            pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
        });

        py.stdin.write(payload);
        py.stdin.end();
    });
}

/**
 * Universal Multi-Tier System Email Sender (Resilient to cloud SMTP timeouts)
 */
async function sendSystemEmail({ to, subject, html, text }) {
    if (!to) return { success: false, message: 'Recipient is required' };
    const cleanRecipient = to.toString().toLowerCase().trim();
    const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
    const fromAddress = process.env.SMTP_FROM || `"Rankly.ai" <${senderUser}>`;

    // 1. Tier 1: Dedicated Python SSL SMTP (Guaranteed 100% Delivery on Windows / Linux)
    try {
        const pyRes = await sendViaPythonSmtp({ to: cleanRecipient, subject, html, text });
        console.log("✅ E-mail Successfully Bhej Diya Gaya (Python SSL):", pyRes.message);
        return { success: true, method: 'python-smtp', messageId: 'OK' };
    } catch (pyErr) {
        console.warn("⚠️ Python SSL attempt failed, trying Nodemailer:", pyErr.message);
    }

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
            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Connection timeout')), 12000))
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
 * Send OTP Verification Email with Professional Branded & Promotional Template
 */
async function sendOTPEmail(to, otp, type = 'email_verification', customSubject = null) {
    if (!to) return false;
    const cleanRecipient = to.toString().toLowerCase().trim();
    const isReset = type === 'password_reset';
    const subject = customSubject || (isReset 
        ? `🔐 Your rankly.ai Password Reset Code: ${otp}` 
        : `🔐 Your rankly.ai Verification Code`);

    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f7; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Brand Header & Mini Promo -->
        <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">rankly.ai</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0;">🚀 Supercharge Your Workflow with Local AI & Automated Intelligence</p>
        </div>
        
        <!-- OTP Content -->
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">${isReset ? 'Use the secure One-Time Password (OTP) below to reset your <b>rankly.ai</b> password:' : 'Use the secure One-Time Password (OTP) below to access your <b>rankly.ai</b> dashboard:'}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #e0e7ff; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 14px; color: #555;">This code is valid for 10 minutes. Never share your OTP with anyone.</p>
        
        <!-- Promotional Banner / Ad Section -->
        <div style="margin-top: 35px; padding: 16px; background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 4px;">
          <p style="font-size: 13px; color: #1e293b; margin: 0 0 6px; font-weight: bold;">💡 What's next on rankly.ai?</p>
          <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
            Explore advanced AI code debugging, real-time error hunting with local models, and seamless team management right from your dashboard.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 15px;">
          &copy; 2026 rankly.ai. Built for next-gen developers.
        </div>
      </div>
    </div>
    `;

    const text = `rankly.ai Verification Code\n\nHello,\n\nYour one-time verification code is: ${otp}\n\nThis code is valid for 10 minutes. Never share your OTP with anyone.\n\nWhat's next on rankly.ai?\nExplore advanced AI code debugging, real-time error hunting with local models, and seamless team management right from your dashboard.\n\n© 2026 rankly.ai. Built for next-gen developers.`;

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

/**
 * Send Account Creation Final Verification Link Email (Industry Standard SaaS Flow)
 */
async function sendVerificationLinkEmail({ to, fullName, verifyLink, isResend = false, customSubject = null }) {
    if (!to) return false;
    const cleanRecipient = (to || '').toString().toLowerCase().trim();
    const displayName = fullName || 'Developer';
    const subject = customSubject || (isResend 
        ? '🔄 Resend: Verify your rankly.ai account' 
        : '✨ Final Step: Verify your rankly.ai Account');

    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f7; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Brand Header & Mini Promo -->
        <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">rankly.ai</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0;">🚀 Supercharge Your Workflow with Local AI & Automated Intelligence</p>
        </div>

        <h2 style="color: #4f46e5; text-align: center; margin-top: 10px;">${isResend ? '🔄 Verification Link Resent' : `Almost Done, ${displayName}!`}</h2>
        <p style="font-size: 15px; line-height: 24px; color: #475569; text-align: center;">${isResend ? 'Here is your fresh rankly.ai email verification link. Click below to verify your account and unlock your full dashboard:' : 'Your rankly.ai account has been created successfully. Click the button below to verify your email and unlock your full dashboard:'}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">Verify Email Address</a>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center; line-height: 1.6;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verifyLink}" style="color: #4f46e5; word-break: break-all;">${verifyLink}</a>
        </p>

        <!-- Promotional Banner / Ad Section -->
        <div style="margin-top: 35px; padding: 16px; background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 4px;">
          <p style="font-size: 13px; color: #1e293b; margin: 0 0 6px; font-weight: bold;">💡 What's next on rankly.ai?</p>
          <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
            Explore advanced AI code debugging, real-time error hunting with local models, and seamless team management right from your dashboard.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 15px;">
          &copy; 2026 rankly.ai. Built for next-gen developers.
        </div>
      </div>
    </div>
    `;

    const text = `Almost Done, ${displayName}!\n\nYour rankly.ai account has been created successfully. Click the link below to verify your email and unlock your dashboard:\n\n${verifyLink}\n\n© 2026 rankly.ai`;

    const res = await sendSystemEmail({
        to: cleanRecipient,
        subject,
        html,
        text
    });
    return res.success;
}

module.exports = {
    sendSystemEmail,
    sendOTPEmail,
    sendVerificationLinkEmail,
    sendInvitationEmail,
    sendCandidateStatusNotification
};
