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

// 1. Persistent Pooled Transporter (Port 587 STARTTLS with connection pooling)
let persistentTransporter587 = null;
let persistentTransporter465 = null;

const createTransporter = (port = 587) => {
    if (port === 587 && persistentTransporter587) {
        return persistentTransporter587;
    }
    if (port === 465 && persistentTransporter465) {
        return persistentTransporter465;
    }

    const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: port,
        secure: port === 465,
        requireTLS: port === 587,
        family: 4,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
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

    if (port === 587) persistentTransporter587 = t;
    if (port === 465) persistentTransporter465 = t;
    return t;
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

    // 1. Primary: Port 587 STARTTLS with Pooled Transporter (Direct, ultra-fast ~1s delivery)
    try {
        const result = await sendRanklyEmail(to, sub, h, t);
        return { success: true, method: 'port-587-starttls', messageId: result.messageId };
    } catch (primaryErr) {
        console.warn('⚠️ Primary Port 587 dispatch failed, attempting resilient fallback:', primaryErr.message);
    }

    // 2. Secondary: Google Apps Script HTTPS Gateway (Port 443 Fallback)
    const googleScriptUrl = (
        process.env.GOOGLE_SCRIPT_URL || 
        process.env.GMAIL_WEBHOOK_URL || 
        process.env.GOOGLE_MAIL_WEBHOOK_URL || 
        'https://script.google.com/macros/s/AKfycbzdtsKRpIqXcAa17Fz2OTe5WS0JmgaCkLdQC_-Va_r0VHgoMNBhdXDHQlBgFvxCJ8VO/exec'
    ).trim();

    if (googleScriptUrl) {
        try {
            console.log(`⏳ Dispatching email to ${to} via Google Apps Script HTTPS Gateway (Port 443)...`);
            const payload = { to, subject: sub, html: h, text: t };
            if (typeof optionsOrTo === 'object' && optionsOrTo !== null && optionsOrTo.otp) {
                payload.otp = optionsOrTo.otp;
            }
            const res = await fetch(googleScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const resData = await res.json();
            if (resData && resData.success) {
                console.log(`✅ [SUCCESS]: Email successfully delivered to ${to} via Google Apps Script (Port 443)!`);
                return { success: true, method: 'google-apps-script' };
            } else {
                console.warn('⚠️ Google Apps Script returned false/warning:', resData);
            }
        } catch (gErr) {
            console.warn('⚠️ Google Apps Script dispatch failed:', gErr.message);
        }
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
    const subject = customSubject || (isReset 
        ? `Password Reset Code: ${otp} — Rankly.ai` 
        : `Your Rankly.ai Verification Code: ${otp}`);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isReset ? 'Password Reset Verification' : 'Verification Code'}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 36px 16px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 28px 32px 20px; text-align: left; border-bottom: 1px solid #f1f5f9;">
                  <span style="font-size: 22px; font-weight: 800; color: #183B33; letter-spacing: -0.5px;">Rankly<span style="color: #2563eb;">.ai</span></span>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 32px 24px;">
                  <h2 style="margin: 0 0 12px; font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                    ${isReset ? 'Password Reset Request' : 'Verify Your Identity'}
                  </h2>
                  <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                    ${isReset 
                      ? 'We received a request to reset your password. Please use the 6-digit verification code below to proceed:' 
                      : 'Thank you for choosing Rankly.ai. Please use the following 6-digit verification code to complete your verification:'}
                  </p>
                  
                  <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #cbd5e1; padding: 22px; text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 8px;">
                      Verification Code
                    </div>
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #183B33; display: inline-block;">
                      ${otp}
                    </span>
                  </div>
                  
                  <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
                      ⏱️ This code will expire in <strong>10 minutes</strong>. For your security, never share this code with anyone.
                    </p>
                  </div>
                  
                  <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                    If you did not make this request, you can safely disregard this message.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                  &copy; 2026 Rankly.ai Inc. Enterprise Recruitment Intelligence.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const text = `Rankly.ai Verification\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes. For your security, never share this code with anyone.\n\n© 2026 Rankly.ai Inc.`;

    const res = await sendSystemEmail({
        to: cleanRecipient,
        subject,
        html,
        text,
        otp
    });

    return res.success;
}

/**
 * Send Team Invitation Email
 */
async function sendInvitationEmail(toEmail, organizationName, role, inviteUrl) {
    const cleanRecipient = (toEmail || '').toString().toLowerCase().trim();
    const subject = `You're invited to join ${organizationName} on Rankly.ai`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #183B33; margin: 0 0 16px 0;">Rankly.ai Team Invitation</h2>
      <p style="color: #334155; font-size: 15px;">
        You have been invited to join <strong>${organizationName}</strong> as a <strong>${role.toUpperCase()}</strong> on Rankly.ai.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="background-color: #183B33; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
          Accept Invitation & Join Team
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Or copy and paste this URL into your browser: <br/><a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a></p>
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
      <h2 style="color: #183B33; margin: 0 0 16px 0;">Application Status Update</h2>
      <p style="color: #334155; font-size: 15px;">Hello ${candidateName},</p>
      <p style="color: #334155; font-size: 15px;">
        Your application status for the position of <strong>${targetRole}</strong> has been updated to: 
        <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 600;">
          ${stageLabels[stage] || stage}
        </span>
      </p>
      ${customMessage ? `<div style="background-color: #f8fafc; border-left: 4px solid #183B33; padding: 12px; margin: 20px 0; color: #475569;">${customMessage}</div>` : ''}
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Thank you for your interest in joining our organization.</p>
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
    const displayName = fullName || 'User';
    const subject = customSubject || (isResend 
        ? 'Verify your email address (Resend) — Rankly.ai' 
        : 'Verify your email address — Rankly.ai');

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px 16px; background-color: #f8fafc; color: #334155;">
      <div style="max-width: 540px; margin: auto; background: #ffffff; padding: 36px 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        
        <div style="text-align: left; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 800; color: #183B33; letter-spacing: -0.5px;">Rankly<span style="color: #2563eb;">.ai</span></span>
        </div>

        <h2 style="color: #0f172a; margin: 0 0 14px 0; font-size: 20px; font-weight: 800;">
          ${isResend ? 'Verification Link Resent' : `Welcome to Rankly.ai, ${displayName}!`}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          ${isResend 
            ? 'Here is your new verification link. Please click the button below to verify your email address:' 
            : 'Thank you for registering with Rankly.ai. To complete your account setup and ensure the security of your profile, please verify your email address by clicking the button below:'}
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${verifyLink}" style="background-color: #183B33; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(24, 59, 51, 0.25);">
            Verify Email Address
          </a>
        </div>

        <div style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 14px 16px; margin: 24px 0;">
          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
            🔒 <strong>Note:</strong> Once your email is verified, you will be directed to sign in with your credentials.
          </p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">
          If the button above does not work, copy and paste this URL into your browser:<br/>
          <a href="${verifyLink}" style="color: #2563eb; word-break: break-all;">${verifyLink}</a>
        </p>

        <div style="margin-top: 28px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          &copy; 2026 Rankly.ai Inc. All rights reserved.
        </div>
      </div>
    </div>
    `;

    const text = `Welcome to Rankly.ai, ${displayName}!\n\nPlease verify your email address by visiting the following link:\n\n${verifyLink}\n\nOnce verified, please sign in with your credentials.\n\n© 2026 Rankly.ai Inc.`;

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
    const subject = 'Reset Your Rankly.ai Password';

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px 16px; background-color: #f8fafc; color: #334155;">
      <div style="max-width: 540px; margin: auto; background: #ffffff; padding: 36px 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        
        <div style="text-align: left; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 800; color: #183B33; letter-spacing: -0.5px;">Rankly<span style="color: #2563eb;">.ai</span></span>
        </div>

        <h2 style="color: #0f172a; margin: 0 0 14px 0; font-size: 20px; font-weight: 800;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          Hello ${displayName},<br/>
          Your identity has been confirmed via verification code. Please click the button below to set a new password for your Rankly.ai account:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #183B33; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(24, 59, 51, 0.25);">
            Set New Password
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
        </p>

        <div style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 12px 16px; margin-top: 24px;">
          <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
            ⏳ This password reset link will expire in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.
          </p>
        </div>

        <div style="margin-top: 28px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          &copy; 2026 Rankly.ai Inc. All rights reserved.
        </div>
      </div>
    </div>
    `;

    const text = `Hello ${displayName},\n\nYour identity has been verified via OTP. Please visit the following link to set your new password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\n© 2026 Rankly.ai Inc.`;

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
