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

    if (!connectionString || (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://'))) {
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        throw new Error('MONGO_URI is missing or invalid in production/Vercel environment variables.');
      }
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
