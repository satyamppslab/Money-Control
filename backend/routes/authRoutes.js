const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, registerUser, loginUser } = require('../controllers/authController');
const { otpRateLimiter } = require('../middleware/otpRateLimiter');

router.post('/send-otp', otpRateLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
