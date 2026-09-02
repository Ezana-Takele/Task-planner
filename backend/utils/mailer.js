// backend/utils/mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create SMTP Transporter
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // SMTP not configured; use simulated dev mode
  }

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass }
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM || `"Task Planner" <no-reply@taskplanner.io>`;

/**
 * Sends a 6-digit Email Verification Code
 */
async function sendVerificationEmail(toEmail, code) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[EMAIL NOTICE] SMTP not configured. Verification code for ${toEmail}: ${code}`);
    return { success: true, devMode: true, code };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
        .card { max-width: 520px; margin: 0 auto; background-color: #111114; border: 1px solid #27272a; border-radius: 8px; padding: 36px; }
        .logo { font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 28px; }
        .code-box { background-color: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #ffffff; margin-bottom: 28px; }
        .footer { font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Task Planner &bull; Security</div>
        <div class="title">Verify Your Email Address</div>
        <div class="desc">Please use the verification code below to verify your Task Planner account. This code will expire in 15 minutes.</div>
        <div class="code-box">${code}</div>
        <div class="desc" style="font-size:12px; margin-bottom:0;">If you did not request this email, no further action is required.</div>
        <div class="footer">&copy; ${new Date().getFullYear()} Task Planner System. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `Your Verification Code: ${code}`,
      text: `Your Task Planner verification code is: ${code}. It will expire in 15 minutes.`,
      html
    });
    console.log(`[EMAIL] Verification email sent to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a 6-digit Password Reset OTP
 */
async function sendPasswordResetEmail(toEmail, code) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[EMAIL NOTICE] SMTP not configured. Password reset code for ${toEmail}: ${code}`);
    return { success: true, devMode: true, code };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
        .card { max-width: 520px; margin: 0 auto; background-color: #111114; border: 1px solid #27272a; border-radius: 8px; padding: 36px; }
        .logo { font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 28px; }
        .code-box { background-color: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #ffffff; margin-bottom: 28px; }
        .alert { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 4px; padding: 12px; font-size: 12px; color: #f87171; margin-bottom: 20px; }
        .footer { font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Task Planner &bull; Account Security</div>
        <div class="title">Password Reset Request</div>
        <div class="desc">A request was received to reset the password for your Task Planner account. Use the authorization code below:</div>
        <div class="code-box">${code}</div>
        <div class="alert">Notice: This code will expire in 15 minutes. If you did not make this request, someone else may be trying to access your account. Please change your password immediately.</div>
        <div class="footer">&copy; ${new Date().getFullYear()} Task Planner System. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `Your Password Reset Code: ${code}`,
      text: `Your Task Planner password reset code is: ${code}. It will expire in 15 minutes.`,
      html
    });
    console.log(`[EMAIL] Password reset email sent to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send password reset email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};

