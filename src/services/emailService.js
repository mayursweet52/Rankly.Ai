const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const nodemailer = require('nodemailer');
const { spawn } = require('child_process');
const path = require('path');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

// High-speed direct IPv4 SMTP transport (no connection pooling to prevent dead socket stalls)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: isSecure,
    family: 4, // Prevents 5-second Windows IPv6 DNS timeout
    auth: {
        user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
        pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false }
});

function sendViaPythonSmtp({ to, subject, html, text }) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'pythonEmailSender.py');
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        let py;
        try {
            py = spawn(pyCmd, [scriptPath]);
        } catch (spawnErr) {
            return reject(spawnErr);
        }

        let stdoutData = '';
        let stderrData = '';

        const timer = setTimeout(() => {
            try { py.kill(); } catch (e) {}
            reject(new Error('Python SMTP timeout after 7s'));
        }, 7000);

        py.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });

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

// 1. Standard Transporter (Port 587 STARTTLS with Port 465 SSL fallback & 6s timeout)
const createTransporter = (port = 587) => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: port,
        secure: port === 465,
        requireTLS: port === 587,
        family: 4,
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 6000,
        auth: {
            user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
            pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * 🚀 rankly.ai Professional Email Dispatcher
 * @param {string|object} toOrOptions - Recipient email or options object
 * @param {string} subject - Email Subject
 * @param {string} htmlContent - Clean HTML body
 * @param {string} textContent - Fallback text
 */
const sendRanklyEmail = async (toOrOptions, subject, htmlContent, textContent) => {
    let to, effectiveSubject, effectiveHtml, effectiveText, customHeaders;
    if (typeof toOrOptions === 'object' && toOrOptions !== null) {
        to = toOrOptions.to;
        effectiveSubject = toOrOptions.subject;
        effectiveHtml = toOrOptions.html || toOrOptions.htmlContent;
        effectiveText = toOrOptions.text || toOrOptions.textContent;
        customHeaders = toOrOptions.headers;
    } else {
        to = toOrOptions;
        effectiveSubject = subject;
        effectiveHtml = htmlContent;
        effectiveText = textContent;
    }

    if (!to) {
        throw new Error('Recipient email is required');
    }

    const cleanRecipient = to.toString().toLowerCase().trim();
    const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
    const cleanText = effectiveText || (effectiveHtml ? effectiveHtml.replace(/<[^>]*>?/gm, '') : 'Your rankly.ai verification details.');

    try {
        let transporter = createTransporter(587);

        // Anti-Spam aur Deliverability ke liye Clean Headers
        const mailOptions = {
            from: `"rankly.ai Security" <${senderUser}>`,
            to: cleanRecipient,
            replyTo: senderUser,
            subject: effectiveSubject,
            text: cleanText,
            html: effectiveHtml,
            headers: {
                'X-Priority': '1', // High priority taaki spam mein na jaye
                'X-MSMail-Priority': 'High',
                'Importance': 'high',
                ...(customHeaders || {})
            }
        };

        try {
            console.log(`⏳ Sending email to ${cleanRecipient} via Port 587 STARTTLS...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ [SUCCESS]: Email successfully delivered! MessageID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (port587Err) {
            console.warn(`⚠️ Port 587 failed (${port587Err.message}), trying Port 465 SSL...`);
            transporter = createTransporter(465);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ [SUCCESS]: Email successfully delivered via Port 465 SSL! MessageID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        }

    } catch (error) {
        console.error(`❌ [SMTP ERROR]: Failed to send email to ${cleanRecipient}. Reason:`, error.message);
        throw new Error(`Email dispatch failed: ${error.message}`);
    }
};

/**
 * Universal Multi-Tier System Email Sender (Calls sendRanklyEmail with fallback)
 */
/**
 * Universal Multi-Tier System Email Sender (Calls sendRanklyEmail with resilient fallbacks)
 */
async function sendSystemEmail(optionsOrTo, subject, html, text) {
    let to, sub, h, t;
    if (typeof optionsOrTo === 'object' && optionsOrTo !== null) {
        to = optionsOrTo.to;
        sub = optionsOrTo.subject;
        h = optionsOrTo.html || optionsOrTo.htmlContent;
        t = optionsOrTo.text || optionsOrTo.textContent;
    } else {
        to = optionsOrTo;
        sub = subject;
        h = html;
        t = text;
    }

    // 1. Primary: Port 587 STARTTLS (100% stable across all cloud providers)
    try {
        const result = await sendRanklyEmail(to, sub, h, t);
        return { success: true, method: 'port-587-starttls', messageId: result.messageId };
    } catch (primaryErr) {
        console.warn('⚠️ Primary Port 587 dispatch failed, attempting resilient fallback:', primaryErr.message);
    }

    // 2. Secondary Fallback: Python SSL/STARTTLS Worker
    try {
        const pyRes = await sendViaPythonSmtp({ to, subject: sub, html: h, text: t });
        return pyRes;
    } catch (fallbackErr) {
        console.warn('⚠️ Python fallback failed:', fallbackErr.message);
    }

    // 3. Tertiary Fallback: Resend REST API (Port 443 HTTPS Backup)
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
                    to: [to],
                    subject: sub,
                    html: h
                })
            });
            const resData = await res.json();
            if (res.ok && resData.id) {
                console.log('✅ Email delivered via Resend API (HTTPS 443) to:', to, 'ID:', resData.id);
                return { success: true, method: 'resend', messageId: resData.id };
            }
        } catch (apiErr) {
            console.warn('[Resend API Warning]:', apiErr.message);
        }
    }

    // 4. Quaternary Fallback: Brevo REST API (Port 443 HTTPS - 300 free emails/day to ANY recipient)
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoApiKey) {
        try {
            const senderUser = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: 'Rankly.ai Security', email: senderUser },
                    to: [{ email: to }],
                    subject: sub,
                    htmlContent: h,
                    textContent: t
                })
            });
            const resData = await res.json();
            if (res.ok && resData.messageId) {
                console.log('✅ Email delivered via Brevo API (HTTPS 443) to:', to, 'ID:', resData.messageId);
                return { success: true, method: 'brevo', messageId: resData.messageId };
            } else {
                console.warn('[Brevo API Response Warning]:', resData);
            }
        } catch (brevoErr) {
            console.warn('[Brevo API Error]:', brevoErr.message);
        }
    }

    console.error('❌ All email delivery tiers failed for:', to);
    return { success: false, message: 'All email delivery tiers failed' };
}

/**
 * Send OTP Verification Email with Ultra-Clean High Deliverability Template
 */
async function sendOTPEmail(to, otp, type = 'email_verification', customSubject = null) {
    if (!to) return false;
    const cleanRecipient = to.toString().toLowerCase().trim();
    const isReset = type === 'password_reset';
    const subject = customSubject || `Your Rankly.ai verification code is ${otp}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 24px 30px; text-align: left; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 20px; font-weight: 800; color: #183B33; letter-spacing: -0.5px;">Rankly<span style="color: #2563eb;">.ai</span></span>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 30px 24px;">
                  <h2 style="margin: 0 0 12px; font-size: 17px; font-weight: 700; color: #0f172a;">${isReset ? 'Password Reset Verification' : 'Your Verification Code'}</h2>
                  <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                    Use the 6-digit code below to complete your verification on Rankly.ai. This code is valid for <strong>10 minutes</strong>.
                  </p>
                  
                  <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #183B33; display: inline-block;">
                      ${otp}
                    </span>
                  </div>
                  
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                    If you did not request this verification code, you can safely ignore this email. Never share this code with anyone.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 18px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                  &copy; 2026 Rankly.ai Inc. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const text = `Rankly.ai Verification Code\n\nYour 6-digit verification code is: ${otp}\n\nThis code is valid for 10 minutes. Never share this code with anyone.\n\n© 2026 Rankly.ai Inc.`;

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
        ? 'Verify your rankly.ai account (Resend)' 
        : 'Verify your rankly.ai account');

    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f7; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">rankly.ai</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Supercharge Your Workflow with Automated Intelligence</p>
        </div>

        <h2 style="color: #4f46e5; text-align: center; margin-top: 10px;">${isResend ? 'Verification Link Resent' : `Almost Done, ${displayName}!`}</h2>
        <p style="font-size: 15px; line-height: 24px; color: #475569; text-align: center;">${isResend ? 'Here is your fresh rankly.ai email verification link. Click below to verify your account and unlock your full dashboard:' : 'Your rankly.ai account has been created successfully. Click the button below to verify your email and unlock your full dashboard:'}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">Verify Email Address</a>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center; line-height: 1.6;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verifyLink}" style="color: #4f46e5; word-break: break-all;">${verifyLink}</a>
        </p>

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

/**
 * Send Password Reset Link Email (Triggered after OTP verification)
 */
async function sendPasswordResetLinkEmail({ to, fullName, resetLink }) {
    if (!to) return false;
    const cleanRecipient = (to || '').toString().toLowerCase().trim();
    const displayName = fullName || 'User';
    const subject = '🔐 Reset your rankly.ai password';

    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f7; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">rankly.ai</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Next-Gen AI Recruitment & Candidate Evaluation</p>
        </div>

        <h2 style="color: #4f46e5; text-align: center; margin-top: 10px;">Password Reset Request</h2>
        <p style="font-size: 15px; line-height: 24px; color: #475569; text-align: center;">
          Hello ${displayName},<br/>
          Your identity has been verified via OTP. Click the secure button below to set your new account password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
            Set New Password
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center; line-height: 1.6;">
          Or copy and paste this link into your mobile or desktop browser:<br/>
          <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
          ⏳ This reset link is valid for 1 hour. If you did not request this, please ignore this email.
        </p>

        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 15px;">
          &copy; 2026 rankly.ai. All rights reserved.
        </div>
      </div>
    </div>
    `;

    const text = `Hello ${displayName},\n\nYour identity has been verified via OTP. Click the link below to set your new password:\n\n${resetLink}\n\nThis link is valid for 1 hour.\n\n© 2026 rankly.ai`;

    const res = await sendSystemEmail({
        to: cleanRecipient,
        subject,
        html,
        text
    });
    return res.success;
}

module.exports = {
    sendRanklyEmail,
    createTransporter,
    sendSystemEmail,
    sendOTPEmail,
    sendVerificationLinkEmail,
    sendPasswordResetLinkEmail,
    sendInvitationEmail,
    sendCandidateStatusNotification
};
