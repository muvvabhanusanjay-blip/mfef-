const mongoose = require('mongoose');

/**
 * Connect to MongoDB database via Mongoose
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spendwise';
    
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true, // Build indexes automatically in development
    });

    console.log(`[MongoDB Connected] Host: ${conn.connection.host} | Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
