const OtpRateLimit = require('../models/OtpRateLimit');

const COOLDOWN_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_SECONDS = 600; // 10 minutes

/**
 * Middleware to check OTP resend cooldown and rate limits per email address.
 */
const otpRateLimiter = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required.',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_SECONDS * 1000);

    const record = await OtpRateLimit.findOne({ email: normalizedEmail });

    if (record) {
      // 1. Check Resend Cooldown (60 seconds)
      const elapsedSeconds = Math.floor((now.getTime() - new Date(record.lastRequestedAt).getTime()) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting a new verification code.`,
          retryAfter: remainingSeconds,
        });
      }

      // 2. Check Window Rate Limit (max 5 requests per 10 minutes)
      if (record.createdAt > windowStart && record.requestCount >= MAX_REQUESTS_PER_WINDOW) {
        const remainingWindow = Math.max(1, Math.floor((new Date(record.createdAt).getTime() + WINDOW_SECONDS * 1000 - now.getTime()) / 1000));
        return res.status(429).json({
          success: false,
          message: 'Too many verification code requests for this email. Please try again later.',
          retryAfter: remainingWindow,
        });
      }
    }

    next();
  } catch (err) {
    console.error('[RATE LIMIT] Error checking rate limit:', err.message);
    next();
  }
};

/**
 * Record an OTP request attempt in the database.
 * @param {string} email 
 * @param {string} [ip] 
 */
const recordOtpRequest = async (email, ip) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_SECONDS * 1000);

    const record = await OtpRateLimit.findOne({ email: normalizedEmail });

    if (record) {
      if (record.createdAt > windowStart) {
        record.requestCount += 1;
      } else {
        record.requestCount = 1;
        record.createdAt = now;
      }
      record.lastRequestedAt = now;
      if (ip) record.ip = ip;
      await record.save();
    } else {
      await OtpRateLimit.create({
        email: normalizedEmail,
        ip,
        lastRequestedAt: now,
        requestCount: 1,
        createdAt: now,
      });
    }
  } catch (err) {
    console.error('[RATE LIMIT] Error recording OTP attempt:', err.message);
  }
};

/**
 * Clear rate limit records for an email address upon successful registration.
 * @param {string} email 
 */
const clearOtpRateLimit = async (email) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    await OtpRateLimit.deleteMany({ email: normalizedEmail });
  } catch (err) {
    console.error('[RATE LIMIT] Error clearing rate limit:', err.message);
  }
};

module.exports = {
  otpRateLimiter,
  recordOtpRequest,
  clearOtpRateLimit,
};
