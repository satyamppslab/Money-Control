const nodemailer = require("nodemailer");

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendOtpEmail(toEmail, otp) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[EMAIL SYSTEM DEV] EMAIL_USER/EMAIL_PASS not configured. Verification code for ${toEmail}: ${otp}`);
    return;
  }

  const fromAddress = `"Money Control" <${process.env.EMAIL_USER}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: "Your Money Control verification code",
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
}

module.exports = sendOtpEmail;
