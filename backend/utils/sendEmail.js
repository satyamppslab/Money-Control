const nodemailer = require("nodemailer");

function getTransporter() {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : "";

  if (!user || !pass) {
    return null;
  }

  // Use direct SSL on port 465 for optimal reliability in serverless environments (e.g. Vercel / AWS Lambda)
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000, // 10s timeout
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}

async function sendOtpEmail(toEmail, otp) {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const transporter = getTransporter();

  if (!transporter) {
    const errorMsg = "Email service is not configured. Missing EMAIL_USER or EMAIL_PASS environment variables.";
    console.error(`[EMAIL SYSTEM ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const fromAddress = `"Money Control" <${user}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `${otp} is your Money Control verification code`,
      text: `Your Money Control verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
          <h2 style="color:#0f172a;margin-top:0;font-size:20px;">Verify your email</h2>
          <p style="color:#475569;font-size:14px;line-height:1.5;">Your 6-digit verification code is:</p>
          <div style="text-align:center;margin:24px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
            <h1 style="letter-spacing:6px;margin:0;color:#059669;font-size:32px;font-family:monospace;">${otp}</h1>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.4;">This code expires in 10 minutes. Don't share it with anyone.</p>
        </div>`,
    });

    console.log(`[EMAIL SYSTEM] Verification email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL SYSTEM ERROR] Failed to send email to ${toEmail}:`, err.message);
    throw new Error(`Failed to deliver email: ${err.message}`);
  }
}

module.exports = sendOtpEmail;
