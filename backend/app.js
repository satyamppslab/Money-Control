const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    env: {
      hasMongoUri: Boolean(process.env.MONGO_URI),
      hasEmailUser: Boolean(process.env.EMAIL_USER),
      hasEmailPass: Boolean(process.env.EMAIL_PASS),
      emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
      isVercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV,
    },
  });
});

module.exports = app;
