const mongoose = require('mongoose');

// Cache the connection across invocations so serverless cold starts / warm
// reuse don't open a new MongoDB connection on every request.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    let connectionString = process.env.MONGO_URI;

    // Fallback to local MongoDB if environment variable is missing, empty, or placeholder
    if (!connectionString || (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://'))) {
      connectionString = 'mongodb://127.0.0.1:27017/money-control';
      console.log('Using local MongoDB fallback connection...');
    }

    cached.promise = mongoose.connect(connectionString).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
