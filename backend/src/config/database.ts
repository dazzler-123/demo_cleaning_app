import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  try {
    // Remove unsupported options from connection string if present
    let mongoUri = config.mongoUri;
    // Remove buffermaxentries from connection string (not supported by MongoDB driver)
    mongoUri = mongoUri.replace(/[?&]buffermaxentries=\d+/gi, '');
    // Clean up any double ? or & characters
    mongoUri = mongoUri.replace(/\?&/g, '?').replace(/&+/g, '&');
    
    // Add connection options for better reliability in production
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds instead of default 10
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      // bufferCommands defaults to true, allowing queries to buffer until connection is ready
      // This is important for server environments where connection might take time
    };

    await mongoose.connect(mongoUri, options);
    
    // Verify connection is ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready after connect()');
    }
    
    console.log('[DB] MongoDB connected');

    // Add connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DB] MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[DB] MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    process.exit(1);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1; // 1 = connected
}
