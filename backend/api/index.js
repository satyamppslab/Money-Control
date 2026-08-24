const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

// Kick off the (cached) DB connection; Mongoose buffers queries until it
// resolves, so requests don't need to wait on this promise.
connectDB().catch((error) => {
  console.error(`Failed to connect to MongoDB: ${error.message}`);
});

module.exports = app;
