const mongoose = require('mongoose');

const otpRateLimitSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  ip: {
    type: String,
    index: true,
    required: false,
  },
  lastRequestedAt: {
    type: Date,
    default: Date.now,
  },
  requestCount: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Document is automatically deleted by MongoDB after 1 hour (3600s)
  },
});

module.exports = mongoose.model('OtpRateLimit', otpRateLimitSchema);
