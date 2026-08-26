const User = require('../models/User');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

// In-memory OTP storage
const otpStore = {};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// Send SMS via Twilio if configured
const sendSMS = async (to, body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({ body, from: fromNumber, to });
      console.log(`[SMS SYSTEM] Real SMS successfully sent to ${to} via Twilio.`);
      return true;
    } catch (err) {
      console.error(`[SMS SYSTEM] Twilio message send failed:`, err);
      return false;
    }
  } else {
    console.warn(`[SMS SYSTEM] Twilio is not configured. Falling back to console logs.`);
    return false;
  }
};

// @desc    Send registration verification OTP
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  const { email, phone } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory (valid for 5 minutes)
    otpStore[phone] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    // Send SMS (real via Twilio or fallback mock to console log)
    const smsBody = `Your MoneyControl verification code is: ${otp}`;
    const sentReal = await sendSMS(phone, smsBody);

    console.log(`\n========================================`);
    console.log(`[OTP SYSTEM] OTP code for ${phone} is: ${otp} (Real SMS Sent: ${sentReal})`);
    console.log(`========================================\n`);

    res.status(200).json({
      success: true,
      message: sentReal 
        ? 'Verification OTP sent successfully to your mobile number.' 
        : 'Mock verification OTP printed to server console logs.',
      mockOtp: sentReal ? undefined : otp // only return mockOtp if real SMS was not sent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password, phone, otp } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate OTP
    const record = otpStore[phone];
    if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired verification OTP.' });
    }

    // Clear OTP record
    delete otpStore[phone];

    const user = await User.create({
      username,
      email,
      password,
      phone,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, sendOtp };
