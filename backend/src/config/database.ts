import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  try {
    // Add connection options for better reliability in production
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds instead of default 10
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      bufferMaxEntries: 0, // Disable mongoose buffering; throw immediately
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(config.mongoUri, options);
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
