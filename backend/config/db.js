const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let connectionString = process.env.MONGO_URI;
    
    // Fallback to local MongoDB if environment variable is missing, empty, or placeholder
    if (!connectionString || (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://'))) {
      connectionString = 'mongodb://127017/money-control'; // local address format
      // Standard local fallback connection:
      connectionString = 'mongodb://127.0.0.1:27017/money-control';
      console.log('Using local MongoDB fallback connection...');
    }

    const conn = await mongoose.connect(connectionString);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
