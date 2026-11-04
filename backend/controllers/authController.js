const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const sendOtpEmail = require('../utils/sendEmail');

// Simple email regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Send registration verification OTP via Email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user is already registered with this email address.',
      });
    }

    // Generate 6-digit numeric OTP and bcrypt hash
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Remove old OTPs for this email and create new one
    await Otp.deleteMany({ email });
    await Otp.create({ email, otpHash });

    // Send email via Gmail transporter
    await sendOtpEmail(email, otp);

    return res.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (err) {
    console.error('[AUTH SYSTEM] Could not send OTP email:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Could not send verification email. Please try again.',
    });
  }
};

// @desc    Verify OTP & Register user
// @route   POST /api/auth/verify-otp (and POST /api/auth/register)
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { otp, username, password, phone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const record = await Otp.findOne({ email });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
    }

    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
    }

    const valid = await bcrypt.compare(String(otp).trim(), record.otpHash);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0 ? `Invalid code. ${remaining} attempts remaining.` : 'Invalid code.',
      });
    }

    // OTP is valid - delete the OTP record
    await record.deleteOne();

    // If registration details are provided, create user and return JWT
    if (password) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'A user is already registered with this email address.' });
      }

      const user = await User.create({
        username: username ? username.trim() : email.split('@')[0],
        email,
        password,
        phone: phone && typeof phone === 'string' && phone.trim() ? phone.trim() : undefined,
      });

      console.log(`[AUTH SYSTEM] User registered successfully: ${email}`);

      return res.status(201).json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        token: generateToken(user._id),
        message: 'Email verified & registered successfully',
      });
    }

    return res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('[AUTH SYSTEM] Verify OTP error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('[AUTH SYSTEM] Login error:', error.message);
    return res.status(500).json({ message: error.message || 'Server error during login.' });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  registerUser: verifyOtp,
  loginUser,
};
