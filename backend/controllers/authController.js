const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

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
    console.warn(`[SMS SYSTEM] Twilio is not configured. Falling back to on-screen / mock mode.`);
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
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Persist OTP in MongoDB (persistent across serverless instances)
    await Otp.deleteMany({ phone });
    await Otp.create({ phone, email, otp });

    // Send SMS (real via Twilio or fallback mock)
    const smsBody = `Your MoneyControl verification code is: ${otp}`;
    const sentReal = await sendSMS(phone, smsBody);

    console.log(`\n========================================`);
    console.log(`[OTP SYSTEM] OTP code for ${phone} is: ${otp} (Real SMS Sent: ${sentReal})`);
    console.log(`========================================\n`);

    res.status(200).json({
      success: true,
      message: sentReal 
        ? 'Verification code sent to your mobile number.' 
        : `Verification code: ${otp}`,
      mockOtp: sentReal ? undefined : otp,
    });
  } catch (error) {
    console.error('[OTP SYSTEM] Error sending OTP:', error);
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
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate OTP against MongoDB database
    const record = await Otp.findOne({ phone, otp });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Delete used OTP from MongoDB
    await Otp.deleteMany({ phone });

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
    console.error('[AUTH SYSTEM] Registration error:', error);
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
