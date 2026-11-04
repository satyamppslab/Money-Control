const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
  }
  return app(req, res);
};
